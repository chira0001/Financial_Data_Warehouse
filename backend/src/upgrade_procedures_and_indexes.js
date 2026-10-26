import mysql from 'mysql2/promise'

async function upgrade() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'banking_loan_source',
  })

  console.log('Upgrading procedures and indexes in banking_loan_source...')

  await conn.query('DROP PROCEDURE IF EXISTS sp_process_loan_payment')
  await conn.query(`
    CREATE PROCEDURE sp_process_loan_payment(
        IN p_payment_id INT,
        IN p_loan_id INT,
        IN p_payment_date DATE,
        IN p_payment_amount DECIMAL(15,2),
        IN p_payment_method VARCHAR(30),
        IN p_payment_status VARCHAR(30),
        OUT p_status_code VARCHAR(20),
        OUT p_status_message VARCHAR(255)
    )
    BEGIN
        DECLARE v_current_status VARCHAR(30);
        DECLARE v_remaining_balance DECIMAL(15,2);

        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            SET p_status_code = 'ERROR';
            SET p_status_message = 'Repayment transaction failed. Rolled back.';
        END;

        START TRANSACTION;

        SELECT loan_status INTO v_current_status
        FROM loans
        WHERE loan_id = p_loan_id
        FOR UPDATE;

        IF v_current_status IS NULL THEN
            SET p_status_code = 'NOT_FOUND';
            SET p_status_message = 'Loan facility does not exist.';
            ROLLBACK;
        ELSEIF v_current_status = 'Closed' THEN
            SET p_status_code = 'ALREADY_CLOSED';
            SET p_status_message = 'Cannot accept payment for an already Closed facility.';
            ROLLBACK;
        ELSEIF p_payment_amount <= 0 THEN
            SET p_status_code = 'INVALID_AMOUNT';
            SET p_status_message = 'Payment amount must be greater than zero.';
            ROLLBACK;
        ELSEIF EXISTS (SELECT 1 FROM loan_payments WHERE payment_id = p_payment_id) THEN
            SET p_status_code = 'DUPLICATE_ID';
            SET p_status_message = 'Payment ID already exists.';
            ROLLBACK;
        ELSE
            INSERT INTO loan_payments (
                payment_id, loan_id, payment_date, payment_amount, payment_method, payment_status
            ) VALUES (
                p_payment_id, p_loan_id, p_payment_date, p_payment_amount, p_payment_method, p_payment_status
            );

            IF p_payment_status = 'Paid' THEN
                SET v_remaining_balance = fn_loan_outstanding_balance(p_loan_id);
                IF v_remaining_balance <= 0 THEN
                    UPDATE loans
                    SET loan_status = 'Closed'
                    WHERE loan_id = p_loan_id;

                    INSERT INTO loan_audit_log (
                        loan_id, action_type, old_status, new_status, notes
                    ) VALUES (
                        p_loan_id, 'STATUS_CHANGE', v_current_status, 'Closed',
                        'Loan facility fully settled and closed by payment.'
                    );
                END IF;
            END IF;

            COMMIT;
            SET p_status_code = 'SUCCESS';
            SET p_status_message = CONCAT('Payment ', p_payment_id, ' posted successfully with InnoDB FOR UPDATE row-lock.');
        END IF;
    END;
  `)
  console.log('sp_process_loan_payment upgraded with FOR UPDATE locking.')

  await conn.query('DROP PROCEDURE IF EXISTS sp_underwrite_loan_application')
  await conn.query(`
    CREATE PROCEDURE sp_underwrite_loan_application(
        IN p_application_id INT,
        IN p_officer_id INT,
        OUT p_decision VARCHAR(20),
        OUT p_decision_reason VARCHAR(255)
    )
    BEGIN
        DECLARE v_applied_amount DECIMAL(15,2);
        DECLARE v_credit_score INT;
        DECLARE v_collateral_total DECIMAL(15,2) DEFAULT 0.00;
        DECLARE v_customer_id INT;
        DECLARE v_status VARCHAR(30);

        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            SET p_decision = 'ERROR';
            SET p_decision_reason = 'Underwriting processing failed. Rolled back.';
        END;

        START TRANSACTION;

        SELECT customer_id, applied_amount, credit_score, approval_status
        INTO v_customer_id, v_applied_amount, v_credit_score, v_status
        FROM loan_applications
        WHERE application_id = p_application_id
        FOR UPDATE;

        IF v_status IS NULL THEN
            SET p_decision = 'NOT_FOUND';
            SET p_decision_reason = 'Loan application ID does not exist.';
            ROLLBACK;
        ELSEIF v_status = 'Approved' THEN
            SET p_decision = 'ALREADY_APPROVED';
            SET p_decision_reason = 'Application has already been approved previously.';
            ROLLBACK;
        ELSE
            SELECT COALESCE(SUM(valuation_amount), 0.00)
            INTO v_collateral_total
            FROM loan_collaterals c
            JOIN loans l ON l.loan_id = c.loan_id
            WHERE l.customer_id = v_customer_id;

            IF v_credit_score < 620 THEN
                SET p_decision = 'REJECTED';
                SET p_decision_reason = CONCAT('Credit score (', v_credit_score, ') below institutional threshold 620.');
                UPDATE loan_applications
                SET approval_status = 'Rejected', decision_notes = p_decision_reason, approval_date = CURDATE()
                WHERE application_id = p_application_id;
            ELSEIF v_applied_amount >= 2000000 AND v_credit_score < 700 AND v_collateral_total < v_applied_amount THEN
                SET p_decision = 'REJECTED';
                SET p_decision_reason = 'High-value facility requires minimum 100% collateral coverage or 700+ credit score.';
                UPDATE loan_applications
                SET approval_status = 'Rejected', decision_notes = p_decision_reason, approval_date = CURDATE()
                WHERE application_id = p_application_id;
            ELSE
                SET p_decision = 'APPROVED';
                SET p_decision_reason = CONCAT('Approved by officer #', p_officer_id, ' with credit score: ', v_credit_score);
                UPDATE loan_applications
                SET approval_status = 'Approved',
                    approved_amount = v_applied_amount,
                    assigned_officer_id = p_officer_id,
                    approval_date = CURDATE(),
                    decision_notes = p_decision_reason
                WHERE application_id = p_application_id;
            END IF;

            COMMIT;
        END IF;
    END;
  `)
  console.log('sp_underwrite_loan_application created for Member 2.')

  const indexes = [
    { name: 'idx_loans_status_enddate', sql: 'CREATE INDEX idx_loans_status_enddate ON loans(loan_status, loan_end_date)' },
    { name: 'idx_payments_loan_date', sql: 'CREATE INDEX idx_payments_loan_date ON loan_payments(loan_id, payment_date)' },
    { name: 'idx_collaterals_loan_val', sql: 'CREATE INDEX idx_collaterals_loan_val ON loan_collaterals(loan_id, valuation_amount)' },
    { name: 'idx_guarantors_loan_nic', sql: 'CREATE INDEX idx_guarantors_loan_nic ON loan_guarantors(loan_id, nic_number)' },
  ]

  for (const idx of indexes) {
    try {
      await conn.query(idx.sql)
      console.log(`Created index: ${idx.name}`)
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log(`Index ${idx.name} already exists.`)
      } else {
        console.warn(`Could not create index ${idx.name}:`, err.message)
      }
    }
  }

  console.log('Database upgrade completed successfully!')
  await conn.end()
}

upgrade().catch(console.error)
