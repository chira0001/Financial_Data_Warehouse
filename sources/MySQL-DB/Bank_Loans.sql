
CREATE DATABASE IF NOT EXISTS banking_loan_source;

USE banking_loan_source;

CREATE TABLE IF NOT EXISTS branches (
    branch_id VARCHAR(10) PRIMARY KEY,
    branch_name VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    province VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id INT PRIMARY KEY,
    customer_code VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    date_of_birth DATE,
    city VARCHAR(50),
    occupation VARCHAR(50),
    branch_id VARCHAR(10),
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE TABLE IF NOT EXISTS loans (
    loan_id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    account_id INT,
    loan_type VARCHAR(50),
    loan_amount DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    loan_start_date DATE,
    loan_end_date DATE,
    loan_status VARCHAR(30),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS loan_payments (
    payment_id INT PRIMARY KEY,
    loan_id INT NOT NULL,
    payment_date DATE,
    payment_amount DECIMAL(15,2),
    payment_method VARCHAR(30),
    payment_status VARCHAR(30),
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

SELECT * FROM loans;
SELECT * FROM loan_payments;




CREATE TABLE IF NOT EXISTS loan_products (
    product_id VARCHAR(10) PRIMARY KEY,
    product_code VARCHAR(20) NOT NULL UNIQUE,
    product_name VARCHAR(100) NOT NULL,
    loan_category VARCHAR(50) NOT NULL,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2) NOT NULL,
    base_interest_rate DECIMAL(5,2) NOT NULL,
    max_tenure_months INT NOT NULL,
    is_collateral_required BOOLEAN NOT NULL DEFAULT FALSE,
    processing_fee_percentage DECIMAL(4,2) DEFAULT 1.00
);

CREATE TABLE IF NOT EXISTS loan_officers (
    officer_id INT PRIMARY KEY,
    employee_code VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    branch_id VARCHAR(10) NOT NULL,
    role_title VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE TABLE IF NOT EXISTS loan_applications (
    application_id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_id VARCHAR(10) NOT NULL,
    assigned_officer_id INT,
    applied_amount DECIMAL(15,2) NOT NULL,
    requested_tenure_months INT NOT NULL,
    application_date DATE NOT NULL,
    credit_score INT NOT NULL,
    approval_status VARCHAR(30) NOT NULL DEFAULT 'Submitted',
    approved_amount DECIMAL(15,2),
    approval_date DATE,
    decision_notes VARCHAR(500),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (product_id) REFERENCES loan_products(product_id),
    FOREIGN KEY (assigned_officer_id) REFERENCES loan_officers(officer_id)
);

CREATE TABLE IF NOT EXISTS loan_collaterals (
    collateral_id INT PRIMARY KEY,
    loan_id INT NOT NULL,
    collateral_type VARCHAR(50) NOT NULL,
    collateral_description VARCHAR(255) NOT NULL,
    valuation_amount DECIMAL(15,2) NOT NULL,
    valuation_date DATE NOT NULL,
    valuer_name VARCHAR(100) NOT NULL,
    document_reference VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'Pledged',
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

CREATE TABLE IF NOT EXISTS loan_guarantors (
    guarantor_id INT PRIMARY KEY,
    loan_id INT NOT NULL,
    guarantor_name VARCHAR(100) NOT NULL,
    nic_number VARCHAR(20) NOT NULL,
    relationship_to_borrower VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    monthly_income DECIMAL(15,2) NOT NULL,
    employer_name VARCHAR(100),
    guarantee_amount DECIMAL(15,2),
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

CREATE TABLE IF NOT EXISTS loan_disbursements (
    disbursement_id INT PRIMARY KEY,
    loan_id INT NOT NULL,
    disbursement_date DATE NOT NULL,
    disbursed_amount DECIMAL(15,2) NOT NULL,
    disbursement_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    authorized_by_officer_id INT,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id),
    FOREIGN KEY (authorized_by_officer_id) REFERENCES loan_officers(officer_id)
);

CREATE TABLE IF NOT EXISTS loan_repayment_schedules (
    schedule_id INT PRIMARY KEY AUTO_INCREMENT,
    loan_id INT NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    installment_amount DECIMAL(15,2) NOT NULL,
    principal_component DECIMAL(15,2) NOT NULL,
    interest_component DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    paid_date DATE NULL,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

CREATE TABLE IF NOT EXISTS loan_fees_and_penalties (
    fee_id INT PRIMARY KEY,
    loan_id INT NOT NULL,
    fee_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    assessed_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    settled_date DATE NULL,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

CREATE TABLE IF NOT EXISTS loan_recovery_actions (
    action_id INT PRIMARY KEY,
    loan_id INT NOT NULL,
    officer_id INT NOT NULL,
    action_date DATE NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    officer_notes VARCHAR(500) NOT NULL,
    borrower_commitment VARCHAR(255),
    next_followup_date DATE,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id),
    FOREIGN KEY (officer_id) REFERENCES loan_officers(officer_id)
);

CREATE TABLE IF NOT EXISTS loan_audit_log (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    old_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NULL,
    old_amount DECIMAL(15,2) NULL,
    new_amount DECIMAL(15,2) NULL,
    old_interest_rate DECIMAL(5,2) NULL,
    new_interest_rate DECIMAL(5,2) NULL,
    modified_by VARCHAR(100) DEFAULT (CURRENT_USER()),
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(500) NULL
);

CREATE TABLE IF NOT EXISTS loan_payment_audit_log (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    loan_id INT NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    old_amount DECIMAL(15,2) NULL,
    new_amount DECIMAL(15,2) NULL,
    old_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NULL,
    modified_by VARCHAR(100) DEFAULT (CURRENT_USER()),
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(500) NULL
);



CREATE INDEX idx_customers_branch ON customers(branch_id);
CREATE INDEX idx_customers_city ON customers(city);
CREATE INDEX idx_officers_branch ON loan_officers(branch_id);
CREATE INDEX idx_officers_status ON loan_officers(status);

CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_account ON loans(account_id);
CREATE INDEX idx_loans_status ON loans(loan_status);
CREATE INDEX idx_loans_dates ON loans(loan_start_date, loan_end_date);
CREATE INDEX idx_loans_type_status ON loans(loan_type, loan_status);

CREATE INDEX idx_products_category ON loan_products(loan_category);
CREATE INDEX idx_products_rate ON loan_products(base_interest_rate);
CREATE INDEX idx_applications_customer ON loan_applications(customer_id);
CREATE INDEX idx_applications_product ON loan_applications(product_id);
CREATE INDEX idx_applications_officer ON loan_applications(assigned_officer_id);
CREATE INDEX idx_applications_status ON loan_applications(approval_status);
CREATE INDEX idx_applications_date ON loan_applications(application_date);

CREATE INDEX idx_payments_loan ON loan_payments(loan_id);
CREATE INDEX idx_payments_date ON loan_payments(payment_date);
CREATE INDEX idx_payments_status ON loan_payments(payment_status);
CREATE INDEX idx_payments_method ON loan_payments(payment_method);
CREATE INDEX idx_schedules_loan ON loan_repayment_schedules(loan_id);
CREATE INDEX idx_schedules_due_date ON loan_repayment_schedules(due_date);
CREATE INDEX idx_schedules_status ON loan_repayment_schedules(status);

CREATE INDEX idx_collaterals_loan ON loan_collaterals(loan_id);
CREATE INDEX idx_collaterals_type ON loan_collaterals(collateral_type);
CREATE INDEX idx_collaterals_status ON loan_collaterals(status);
CREATE INDEX idx_guarantors_loan ON loan_guarantors(loan_id);
CREATE INDEX idx_guarantors_nic ON loan_guarantors(nic_number);

CREATE INDEX idx_disbursements_loan ON loan_disbursements(loan_id);
CREATE INDEX idx_disbursements_date ON loan_disbursements(disbursement_date);
CREATE INDEX idx_disbursements_officer ON loan_disbursements(authorized_by_officer_id);
CREATE INDEX idx_fees_loan ON loan_fees_and_penalties(loan_id);
CREATE INDEX idx_fees_status ON loan_fees_and_penalties(status);
CREATE INDEX idx_fees_date ON loan_fees_and_penalties(assessed_date);
CREATE INDEX idx_recovery_loan ON loan_recovery_actions(loan_id);
CREATE INDEX idx_recovery_officer ON loan_recovery_actions(officer_id);
CREATE INDEX idx_recovery_date ON loan_recovery_actions(action_date);
CREATE INDEX idx_recovery_followup ON loan_recovery_actions(next_followup_date);

CREATE INDEX idx_audit_loan ON loan_audit_log(loan_id);
CREATE INDEX idx_audit_date ON loan_audit_log(modified_at);
CREATE INDEX idx_payment_audit_loan ON loan_payment_audit_log(loan_id);
CREATE INDEX idx_payment_audit_payment ON loan_payment_audit_log(payment_id);

DELIMITER $$

DROP FUNCTION IF EXISTS fn_calculate_monthly_emi$$
CREATE FUNCTION fn_calculate_monthly_emi(
    p_principal DECIMAL(15,2),
    p_annual_rate DECIMAL(5,2),
    p_tenure_months INT
)
RETURNS DECIMAL(15,2)
DETERMINISTIC
NO SQL
BEGIN
    DECLARE v_monthly_rate DOUBLE;
    DECLARE v_factor DOUBLE;
    DECLARE v_emi DECIMAL(15,2);
    
    IF p_principal IS NULL OR p_principal <= 0 OR p_tenure_months IS NULL OR p_tenure_months <= 0 THEN
        RETURN 0.00;
    END IF;
    
    IF p_annual_rate IS NULL OR p_annual_rate = 0 THEN
        RETURN ROUND(p_principal / p_tenure_months, 2);
    END IF;
    
    SET v_monthly_rate = (p_annual_rate / 100.0) / 12.0;
    SET v_factor = POW(1.0 + v_monthly_rate, p_tenure_months);
    SET v_emi = ROUND(p_principal * v_monthly_rate * v_factor / (v_factor - 1.0), 2);
    
    RETURN v_emi;
END$$

DROP FUNCTION IF EXISTS fn_calculate_total_interest$$
CREATE FUNCTION fn_calculate_total_interest(
    p_principal DECIMAL(15,2),
    p_annual_rate DECIMAL(5,2),
    p_tenure_months INT
)
RETURNS DECIMAL(15,2)
DETERMINISTIC
NO SQL
BEGIN
    DECLARE v_emi DECIMAL(15,2);
    IF p_principal IS NULL OR p_principal <= 0 OR p_tenure_months IS NULL OR p_tenure_months <= 0 THEN
        RETURN 0.00;
    END IF;
    SET v_emi = fn_calculate_monthly_emi(p_principal, p_annual_rate, p_tenure_months);
    RETURN ROUND((v_emi * p_tenure_months) - p_principal, 2);
END$$

DROP FUNCTION IF EXISTS fn_loan_outstanding_balance$$
CREATE FUNCTION fn_loan_outstanding_balance(p_loan_id INT)
RETURNS DECIMAL(15,2)
READS SQL DATA
BEGIN
    DECLARE v_principal DECIMAL(15,2);
    DECLARE v_paid DECIMAL(15,2);
    
    SELECT COALESCE(loan_amount, 0.00) INTO v_principal
    FROM loans
    WHERE loan_id = p_loan_id;
    
    IF v_principal IS NULL THEN
        RETURN 0.00;
    END IF;
    
    SELECT COALESCE(SUM(payment_amount), 0.00) INTO v_paid
    FROM loan_payments
    WHERE loan_id = p_loan_id AND payment_status = 'Paid';
    
    RETURN GREATEST(0.00, v_principal - v_paid);
END$$

DROP FUNCTION IF EXISTS fn_days_overdue$$
CREATE FUNCTION fn_days_overdue(p_loan_id INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_end_date DATE;
    DECLARE v_status VARCHAR(30);
    DECLARE v_balance DECIMAL(15,2);
    
    SELECT loan_end_date, loan_status INTO v_end_date, v_status
    FROM loans
    WHERE loan_id = p_loan_id;
    
    IF v_status IS NULL OR v_status = 'Closed' THEN
        RETURN 0;
    END IF;
    
    SET v_balance = fn_loan_outstanding_balance(p_loan_id);
    IF v_balance <= 0 THEN
        RETURN 0;
    END IF;
    
    IF CURDATE() > v_end_date THEN
        RETURN DATEDIFF(CURDATE(), v_end_date);
    ELSE
        RETURN 0;
    END IF;
END$$

DROP FUNCTION IF EXISTS fn_loan_risk_tier$$
CREATE FUNCTION fn_loan_risk_tier(p_loan_id INT)
RETURNS VARCHAR(20)
READS SQL DATA
BEGIN
    DECLARE v_status VARCHAR(30);
    DECLARE v_days_overdue INT;
    DECLARE v_late_payments INT;
    DECLARE v_rate DECIMAL(5,2);
    
    SELECT loan_status, interest_rate INTO v_status, v_rate
    FROM loans
    WHERE loan_id = p_loan_id;
    
    IF v_status IS NULL THEN
        RETURN 'UNKNOWN';
    END IF;
    
    IF v_status = 'Closed' THEN
        RETURN 'NO_RISK';
    END IF;
    
    SET v_days_overdue = fn_days_overdue(p_loan_id);
    
    SELECT COUNT(*) INTO v_late_payments
    FROM loan_payments
    WHERE loan_id = p_loan_id AND payment_status = 'Late';
    
    IF v_status = 'Overdue' OR v_days_overdue > 90 THEN
        RETURN 'CRITICAL';
    ELSEIF v_days_overdue > 0 OR v_late_payments >= 2 THEN
        RETURN 'HIGH';
    ELSEIF v_late_payments = 1 OR v_rate >= 15.00 THEN
        RETURN 'MEDIUM';
    ELSE
        RETURN 'LOW';
    END IF;
END$$


DROP TRIGGER IF EXISTS trg_loans_before_insert$$
CREATE TRIGGER trg_loans_before_insert
BEFORE INSERT ON loans
FOR EACH ROW
BEGIN
    IF NEW.loan_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Loan amount must be strictly greater than zero.';
    END IF;
    IF NEW.interest_rate < 0 OR NEW.interest_rate > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Interest rate must be between 0.00% and 100.00%.';
    END IF;
    IF NEW.loan_end_date <= NEW.loan_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Loan maturity date must be after start date.';
    END IF;
    IF NEW.loan_type NOT IN ('Personal', 'Housing', 'Vehicle', 'Education', 'Business') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Invalid loan type specified.';
    END IF;
    IF NEW.loan_status NOT IN ('Active', 'Closed', 'Overdue', 'Pending', 'Defaulted') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Invalid loan status specified.';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_loans_after_update$$
CREATE TRIGGER trg_loans_after_update
AFTER UPDATE ON loans
FOR EACH ROW
BEGIN
    IF OLD.loan_status <> NEW.loan_status OR OLD.loan_amount <> NEW.loan_amount OR OLD.interest_rate <> NEW.interest_rate THEN
        INSERT INTO loan_audit_log (
            loan_id, action_type, old_status, new_status,
            old_amount, new_amount, old_interest_rate, new_interest_rate, notes
        ) VALUES (
            NEW.loan_id,
            CASE WHEN OLD.loan_status <> NEW.loan_status THEN 'STATUS_CHANGE' ELSE 'UPDATE' END,
            OLD.loan_status, NEW.loan_status,
            OLD.loan_amount, NEW.loan_amount,
            OLD.interest_rate, NEW.interest_rate,
            'Automated audit recorded by database trigger trg_loans_after_update'
        );
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_loan_payments_before_insert$$
CREATE TRIGGER trg_loan_payments_before_insert
BEFORE INSERT ON loan_payments
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(30);
    
    IF NEW.payment_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Payment amount must be strictly positive.';
    END IF;
    IF NEW.payment_status NOT IN ('Paid', 'Pending', 'Late', 'Reversed') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Invalid payment status.';
    END IF;
    
    SELECT loan_status INTO v_status FROM loans WHERE loan_id = NEW.loan_id;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Associated loan facility does not exist.';
    ELSEIF v_status = 'Closed' AND COALESCE(@allow_historical_seed, 0) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation Error: Cannot post payment against an already Closed loan facility.';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_loan_payments_after_insert$$
CREATE TRIGGER trg_loan_payments_after_insert
AFTER INSERT ON loan_payments
FOR EACH ROW
BEGIN
    INSERT INTO loan_payment_audit_log (
        payment_id, loan_id, action_type, new_amount, new_status, notes
    ) VALUES (
        NEW.payment_id, NEW.loan_id, 'PAYMENT_RECEIVED', NEW.payment_amount, NEW.payment_status,
        CONCAT('Payment processed via ', NEW.payment_method)
    );
END$$


DROP PROCEDURE IF EXISTS sp_disburse_new_loan$$
CREATE PROCEDURE sp_disburse_new_loan(
    IN p_loan_id INT,
    IN p_customer_id INT,
    IN p_account_id INT,
    IN p_loan_type VARCHAR(50),
    IN p_loan_amount DECIMAL(15,2),
    IN p_interest_rate DECIMAL(5,2),
    IN p_loan_start_date DATE,
    IN p_loan_end_date DATE,
    OUT p_status_code VARCHAR(20),
    OUT p_status_message VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'ERROR';
        SET p_status_message = 'Disbursement failed. Transaction rolled back.';
    END;

    START TRANSACTION;
    
    IF p_loan_id IS NULL OR EXISTS (SELECT 1 FROM loans WHERE loan_id = p_loan_id) THEN
        SET p_status_code = 'DUPLICATE_KEY';
        SET p_status_message = 'Loan ID already exists or is invalid.';
        ROLLBACK;
    ELSEIF p_loan_amount <= 0 THEN
        SET p_status_code = 'INVALID_AMOUNT';
        SET p_status_message = 'Loan amount must be greater than zero.';
        ROLLBACK;
    ELSEIF p_loan_end_date <= p_loan_start_date THEN
        SET p_status_code = 'INVALID_DATES';
        SET p_status_message = 'Maturity date must be after disbursement date.';
        ROLLBACK;
    ELSE
        INSERT INTO loans (
            loan_id, customer_id, account_id, loan_type,
            loan_amount, interest_rate, loan_start_date, loan_end_date, loan_status
        ) VALUES (
            p_loan_id, p_customer_id, p_account_id, p_loan_type,
            p_loan_amount, p_interest_rate, p_loan_start_date, p_loan_end_date, 'Active'
        );

        INSERT INTO loan_audit_log (
            loan_id, action_type, old_status, new_status,
            old_amount, new_amount, old_interest_rate, new_interest_rate, notes
        ) VALUES (
            p_loan_id, 'DISBURSEMENT', NULL, 'Active',
            NULL, p_loan_amount, NULL, p_interest_rate,
            'New facility disbursed via sp_disburse_new_loan'
        );

        COMMIT;
        SET p_status_code = 'SUCCESS';
        SET p_status_message = CONCAT('Loan facility ', p_loan_id, ' disbursed successfully.');
    END IF;
END$$

DROP PROCEDURE IF EXISTS sp_process_loan_payment$$
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
        SET p_status_message = CONCAT('Payment ', p_payment_id, ' successfully posted.');
    END IF;
END$$

DROP PROCEDURE IF EXISTS sp_restructure_loan$$
CREATE PROCEDURE sp_restructure_loan(
    IN p_loan_id INT,
    IN p_new_interest_rate DECIMAL(5,2),
    IN p_new_end_date DATE,
    IN p_officer_reason VARCHAR(255),
    OUT p_status_code VARCHAR(20),
    OUT p_status_message VARCHAR(255)
)
BEGIN
    DECLARE v_old_rate DECIMAL(5,2);
    DECLARE v_old_end_date DATE;
    DECLARE v_status VARCHAR(30);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'ERROR';
        SET p_status_message = 'Facility restructuring failed. Rolled back.';
    END;

    START TRANSACTION;

    SELECT interest_rate, loan_end_date, loan_status
    INTO v_old_rate, v_old_end_date, v_status
    FROM loans
    WHERE loan_id = p_loan_id;

    IF v_status IS NULL THEN
        SET p_status_code = 'NOT_FOUND';
        SET p_status_message = 'Loan ID does not exist.';
        ROLLBACK;
    ELSEIF v_status = 'Closed' THEN
        SET p_status_code = 'INVALID_STATE';
        SET p_status_message = 'Cannot restructure an already closed loan.';
        ROLLBACK;
    ELSEIF p_new_end_date <= CURDATE() THEN
        SET p_status_code = 'INVALID_DATE';
        SET p_status_message = 'New end date must be strictly in the future.';
        ROLLBACK;
    ELSE
        UPDATE loans
        SET interest_rate = p_new_interest_rate,
            loan_end_date = p_new_end_date,
            loan_status = 'Active'
        WHERE loan_id = p_loan_id;

        INSERT INTO loan_audit_log (
            loan_id, action_type, old_status, new_status,
            old_interest_rate, new_interest_rate, notes
        ) VALUES (
            p_loan_id, 'RESTRUCTURE', v_status, 'Active',
            v_old_rate, p_new_interest_rate,
            CONCAT('Restructure: ', p_officer_reason, ' Extended to: ', p_new_end_date)
        );

        COMMIT;
        SET p_status_code = 'SUCCESS';
        SET p_status_message = CONCAT('Loan ', p_loan_id, ' successfully restructured.');
    END IF;
END$$

DROP PROCEDURE IF EXISTS sp_mark_overdue_facilities$$
CREATE PROCEDURE sp_mark_overdue_facilities()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_loan_id INT;
    DECLARE cur_loans CURSOR FOR
        SELECT loan_id
        FROM loans
        WHERE loan_status = 'Active'
          AND loan_end_date < CURDATE()
          AND fn_loan_outstanding_balance(loan_id) > 0;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;

    OPEN cur_loans;
    read_loop: LOOP
        FETCH cur_loans INTO v_loan_id;
        IF done THEN
            LEAVE read_loop;
        END IF;

        UPDATE loans
        SET loan_status = 'Overdue'
        WHERE loan_id = v_loan_id;

        INSERT INTO loan_audit_log (
            loan_id, action_type, old_status, new_status, notes
        ) VALUES (
            v_loan_id, 'STATUS_CHANGE', 'Active', 'Overdue',
            'Facility automatically transitioned to Overdue past maturity date.'
        );
    END LOOP;
    CLOSE cur_loans;

    COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_underwrite_loan_application$$
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
END$$

DELIMITER ;

SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS evt_daily_loan_status_check;
DELIMITER $$
CREATE EVENT evt_daily_loan_status_check
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
COMMENT 'Evaluates active loans past maturity daily at midnight and flags them Overdue'
DO
BEGIN
    CALL sp_mark_overdue_facilities();
END$$
DELIMITER ;


CREATE OR REPLACE VIEW vw_loan_officer_active_facilities AS
SELECT 
    l.loan_id,
    l.customer_id,
    l.account_id,
    l.loan_type,
    l.loan_amount AS principal_amount,
    l.interest_rate,
    l.loan_start_date,
    l.loan_end_date,
    TIMESTAMPDIFF(MONTH, l.loan_start_date, l.loan_end_date) AS tenure_months,
    fn_calculate_monthly_emi(
        l.loan_amount, 
        l.interest_rate, 
        GREATEST(1, TIMESTAMPDIFF(MONTH, l.loan_start_date, l.loan_end_date))
    ) AS estimated_monthly_emi,
    COALESCE(SUM(CASE WHEN p.payment_status = 'Paid' THEN p.payment_amount ELSE 0 END), 0.00) AS total_repaid,
    fn_loan_outstanding_balance(l.loan_id) AS outstanding_balance,
    DATEDIFF(l.loan_end_date, CURDATE()) AS days_to_maturity,
    fn_loan_risk_tier(l.loan_id) AS risk_tier
FROM loans l
LEFT JOIN loan_payments p ON p.loan_id = l.loan_id
WHERE l.loan_status = 'Active'
GROUP BY 
    l.loan_id, l.customer_id, l.account_id, l.loan_type,
    l.loan_amount, l.interest_rate, l.loan_start_date, l.loan_end_date;

CREATE OR REPLACE VIEW vw_overdue_collections_queue AS
SELECT 
    l.loan_id,
    l.customer_id,
    l.loan_type,
    l.loan_amount AS principal_amount,
    l.interest_rate,
    l.loan_end_date AS maturity_date,
    fn_days_overdue(l.loan_id) AS days_overdue,
    fn_loan_outstanding_balance(l.loan_id) AS overdue_balance,
    MAX(p.payment_date) AS last_payment_date,
    COUNT(CASE WHEN p.payment_status = 'Late' THEN 1 END) AS late_payment_incidents,
    fn_loan_risk_tier(l.loan_id) AS risk_tier
FROM loans l
LEFT JOIN loan_payments p ON p.loan_id = l.loan_id
WHERE l.loan_status = 'Overdue'
GROUP BY 
    l.loan_id, l.customer_id, l.loan_type, l.loan_amount,
    l.interest_rate, l.loan_end_date;

CREATE OR REPLACE VIEW vw_customer_loan_statement AS
SELECT 
    l.customer_id,
    COUNT(l.loan_id) AS total_facilities_count,
    SUM(CASE WHEN l.loan_status = 'Active' THEN 1 ELSE 0 END) AS active_facilities_count,
    SUM(CASE WHEN l.loan_status = 'Overdue' THEN 1 ELSE 0 END) AS overdue_facilities_count,
    SUM(CASE WHEN l.loan_status = 'Closed' THEN 1 ELSE 0 END) AS closed_facilities_count,
    SUM(l.loan_amount) AS total_principal_borrowed,
    COALESCE(SUM(CASE WHEN p.payment_status = 'Paid' THEN p.payment_amount ELSE 0 END), 0.00) AS total_amount_repaid,
    SUM(fn_loan_outstanding_balance(l.loan_id)) AS net_outstanding_exposure
FROM loans l
LEFT JOIN loan_payments p ON p.loan_id = l.loan_id
GROUP BY l.customer_id;

CREATE OR REPLACE VIEW vw_daily_payment_reconciliation AS
SELECT 
    payment_date,
    payment_method,
    payment_status,
    COUNT(payment_id) AS payment_count,
    SUM(payment_amount) AS total_amount_collected,
    ROUND(AVG(payment_amount), 2) AS average_amount
FROM loan_payments
GROUP BY payment_date, payment_method, payment_status;

CREATE OR REPLACE VIEW vw_loan_portfolio_health_metrics AS
SELECT 
    loan_type,
    COUNT(*) AS total_facilities,
    SUM(CASE WHEN loan_status = 'Active' THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN loan_status = 'Overdue' THEN 1 ELSE 0 END) AS overdue_count,
    SUM(CASE WHEN loan_status = 'Closed' THEN 1 ELSE 0 END) AS closed_count,
    ROUND(SUM(CASE WHEN loan_status = 'Overdue' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS overdue_rate_pct,
    SUM(loan_amount) AS total_portfolio_principal,
    ROUND(AVG(interest_rate), 2) AS avg_interest_rate
FROM loans
GROUP BY loan_type;

CREATE ROLE IF NOT EXISTS role_loan_officer;
CREATE ROLE IF NOT EXISTS role_loan_manager;
CREATE ROLE IF NOT EXISTS role_loan_auditor;

GRANT SELECT ON banking_loan_source.loans TO role_loan_officer;
GRANT SELECT ON banking_loan_source.loan_payments TO role_loan_officer;
GRANT SELECT ON banking_loan_source.vw_loan_officer_active_facilities TO role_loan_officer;
GRANT SELECT ON banking_loan_source.vw_customer_loan_statement TO role_loan_officer;
GRANT SELECT ON banking_loan_source.vw_daily_payment_reconciliation TO role_loan_officer;
GRANT EXECUTE ON PROCEDURE banking_loan_source.sp_process_loan_payment TO role_loan_officer;
GRANT EXECUTE ON FUNCTION banking_loan_source.fn_calculate_monthly_emi TO role_loan_officer;
GRANT EXECUTE ON FUNCTION banking_loan_source.fn_loan_outstanding_balance TO role_loan_officer;

GRANT SELECT, INSERT, UPDATE ON banking_loan_source.loans TO role_loan_manager;
GRANT SELECT, INSERT, UPDATE ON banking_loan_source.loan_payments TO role_loan_manager;
GRANT SELECT ON banking_loan_source.* TO role_loan_manager;
GRANT EXECUTE ON PROCEDURE banking_loan_source.sp_disburse_new_loan TO role_loan_manager;
GRANT EXECUTE ON PROCEDURE banking_loan_source.sp_process_loan_payment TO role_loan_manager;
GRANT EXECUTE ON PROCEDURE banking_loan_source.sp_restructure_loan TO role_loan_manager;
GRANT EXECUTE ON PROCEDURE banking_loan_source.sp_mark_overdue_facilities TO role_loan_manager;
GRANT EXECUTE ON PROCEDURE banking_loan_source.sp_underwrite_loan_application TO role_loan_manager;
GRANT EXECUTE ON FUNCTION banking_loan_source.fn_calculate_monthly_emi TO role_loan_manager;
GRANT EXECUTE ON FUNCTION banking_loan_source.fn_calculate_total_interest TO role_loan_manager;
GRANT EXECUTE ON FUNCTION banking_loan_source.fn_loan_outstanding_balance TO role_loan_manager;
GRANT EXECUTE ON FUNCTION banking_loan_source.fn_days_overdue TO role_loan_manager;
GRANT EXECUTE ON FUNCTION banking_loan_source.fn_loan_risk_tier TO role_loan_manager;

GRANT SELECT ON banking_loan_source.loan_audit_log TO role_loan_auditor;
GRANT SELECT ON banking_loan_source.loan_payment_audit_log TO role_loan_auditor;
GRANT SELECT ON banking_loan_source.vw_loan_portfolio_health_metrics TO role_loan_auditor;
GRANT SELECT ON banking_loan_source.vw_overdue_collections_queue TO role_loan_auditor;
GRANT SELECT ON banking_loan_source.vw_daily_payment_reconciliation TO role_loan_auditor;

GRANT role_loan_officer, role_loan_manager, role_loan_auditor TO CURRENT_USER;

FLUSH PRIVILEGES;

CREATE INDEX idx_loans_status_enddate ON loans(loan_status, loan_end_date);
CREATE INDEX idx_payments_loan_date ON loan_payments(loan_id, payment_date);
CREATE INDEX idx_collaterals_loan_val ON loan_collaterals(loan_id, valuation_amount);
CREATE INDEX idx_guarantors_loan_nic ON loan_guarantors(loan_id, nic_number);

SELECT 'Active Facilities Sample' AS report_title;
SELECT * FROM vw_loan_officer_active_facilities LIMIT 5;

SELECT 'Overdue Collections Queue Sample' AS report_title;
SELECT * FROM vw_overdue_collections_queue LIMIT 5;

SELECT 'Portfolio Health Metrics' AS report_title;
SELECT * FROM vw_loan_portfolio_health_metrics;
