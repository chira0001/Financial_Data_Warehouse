SET @gold_started_at = NOW();
CALL warehouse.sp_log_etl_run('GOLD', 'RUNNING', @gold_started_at, NULL, 'Gold load started');
START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM warehouse.fact_loan_payment;
DELETE FROM warehouse.fact_loan_payment_audit;
DELETE FROM warehouse.fact_loan_audit;
DELETE FROM warehouse.fact_loan_recovery_action;
DELETE FROM warehouse.fact_loan_fee;
DELETE FROM warehouse.fact_loan_guarantor;
DELETE FROM warehouse.fact_loan_collateral;
DELETE FROM warehouse.fact_loan_repayment_schedule;
DELETE FROM warehouse.fact_loan_disbursement;
DELETE FROM warehouse.fact_loan_application;
DELETE FROM warehouse.fact_loan;
DELETE FROM warehouse.fact_exchange_rate;
DELETE FROM warehouse.fact_transaction;
DELETE FROM warehouse.dim_account;
DELETE FROM warehouse.dim_customer;
DELETE FROM warehouse.dim_branch;
DELETE FROM warehouse.dim_currency;
DELETE FROM warehouse.dim_loan_officer;
DELETE FROM warehouse.dim_loan_product;
DELETE FROM warehouse.dim_date;

SET FOREIGN_KEY_CHECKS = 1;
SET SESSION cte_max_recursion_depth = 20000;

INSERT INTO warehouse.dim_date (
    date_key, full_date, calendar_year, calendar_quarter, calendar_month,
    month_name, day_of_month, day_of_week, day_name, week_of_year
)
WITH RECURSIVE date_series AS (
    SELECT DATE('2019-01-01') AS full_date
    UNION ALL
    SELECT full_date + INTERVAL 1 DAY
    FROM date_series
    WHERE full_date < DATE('2045-12-31')
)
SELECT
    warehouse.fn_date_key(full_date),
    full_date,
    YEAR(full_date),
    QUARTER(full_date),
    MONTH(full_date),
    MONTHNAME(full_date),
    DAY(full_date),
    DAYOFWEEK(full_date),
    DAYNAME(full_date),
    WEEK(full_date, 3)
FROM date_series;

INSERT INTO warehouse.dim_currency (currency_code, is_reporting_currency)
SELECT currency_code, currency_code = 'LKR'
FROM (
    SELECT DISTINCT currency AS currency_code
    FROM warehouse.silver_banking_transactions
    WHERE currency IS NOT NULL
    UNION
    SELECT DISTINCT target_currency
    FROM warehouse.silver_exchange_rates
    WHERE target_currency IS NOT NULL
    UNION
    SELECT 'LKR'
) currencies;

INSERT INTO warehouse.dim_branch (branch_id, branch_name, city, province)
SELECT branch_id, branch_name, city, province
FROM warehouse.silver_branches;

INSERT INTO warehouse.dim_customer (
    customer_id, first_name, last_name, gender, date_of_birth, city, occupation
)
SELECT DISTINCT
    customer_id, first_name, last_name, gender, date_of_birth, city, occupation
FROM warehouse.silver_customers;

INSERT INTO warehouse.dim_account (
    account_id, customer_id, branch_id, account_type, opening_date, balance
)
SELECT account_id, customer_id, branch_id, account_type, opening_date, balance
FROM warehouse.silver_accounts;

INSERT INTO warehouse.dim_loan_product (
    product_id, product_code, product_name, loan_category, min_amount, max_amount,
    base_interest_rate, max_tenure_months, is_collateral_required, processing_fee_percentage
)
SELECT product_id, product_code, product_name, loan_category, min_amount, max_amount,
       base_interest_rate, max_tenure_months, is_collateral_required, processing_fee_percentage
FROM warehouse.silver_loan_products;

INSERT INTO warehouse.dim_loan_officer (officer_id, employee_code, branch_id, role_title, status)
SELECT officer_id, employee_code, branch_id, role_title, status
FROM warehouse.silver_loan_officers;

INSERT INTO warehouse.fact_transaction (
    transaction_id, date_key, account_key, customer_key, branch_key,
    currency_key, transaction_type, amount, lkr_amount, channel, description
)
SELECT
    t.transction_id,
    warehouse.fn_date_key(t.transaction_date),
    a.account_key,
    c.customer_key,
    b.branch_key,
    currency.currency_key,
    t.transaction_type,
    t.amount,
    t.lkr_amount,
    t.channel,
    t.description
FROM warehouse.silver_banking_transactions t
LEFT JOIN warehouse.dim_account a ON a.account_id = t.account_id
LEFT JOIN warehouse.dim_customer c ON c.customer_id = a.customer_id
LEFT JOIN warehouse.dim_branch b ON b.branch_id = a.branch_id
LEFT JOIN warehouse.dim_currency currency ON currency.currency_code = t.currency
JOIN warehouse.dim_date d ON d.full_date = t.transaction_date;

INSERT INTO warehouse.fact_exchange_rate (
    date_key, currency_key, base_currency, rate
)
SELECT
    warehouse.fn_date_key(rate.rate_date),
    currency.currency_key,
    'LKR',
    rate.rate
FROM warehouse.silver_exchange_rates rate
JOIN warehouse.dim_currency currency
    ON currency.currency_code = rate.target_currency
JOIN warehouse.dim_date d
    ON d.full_date = rate.rate_date;

INSERT INTO warehouse.fact_loan (
    loan_id, customer_key, account_key, start_date_key, end_date_key,
    loan_type, loan_amount, interest_rate, loan_status
)
SELECT
    loan.loan_id,
    customer.customer_key,
    account.account_key,
    warehouse.fn_date_key(loan.loan_start_date),
    warehouse.fn_date_key(loan.loan_end_date),
    loan.loan_type,
    loan.loan_amount,
    loan.interest_rate,
    loan.loan_status
FROM warehouse.silver_loans loan
LEFT JOIN warehouse.dim_customer customer
    ON customer.customer_id = loan.customer_id
LEFT JOIN warehouse.dim_account account
    ON account.account_id = loan.account_id;

INSERT INTO warehouse.fact_loan_payment (
    payment_id, loan_id, date_key, payment_amount, payment_method, payment_status
)
SELECT
    payment.payment_id,
    payment.loan_id,
    warehouse.fn_date_key(payment.payment_date),
    payment.payment_amount,
    payment.payment_method,
    payment.payment_status
FROM warehouse.silver_loan_payments payment
JOIN warehouse.fact_loan loan ON loan.loan_id = payment.loan_id
LEFT JOIN warehouse.dim_date d ON d.full_date = payment.payment_date;

INSERT INTO warehouse.fact_loan_application (
    application_id, customer_key, product_key, officer_key, application_date_key, approval_date_key,
    applied_amount, approved_amount, requested_tenure_months, credit_score, approval_status
)
SELECT a.application_id, c.customer_key, p.product_key, o.officer_key,
       warehouse.fn_date_key(a.application_date), warehouse.fn_date_key(a.approval_date),
       a.applied_amount, a.approved_amount, a.requested_tenure_months, a.credit_score, a.approval_status
FROM warehouse.silver_loan_applications a
LEFT JOIN warehouse.dim_customer c ON c.customer_id = CONCAT('C', LPAD(a.customer_id, GREATEST(4, LENGTH(a.customer_id)), '0'))
LEFT JOIN warehouse.dim_loan_product p ON p.product_id = a.product_id
LEFT JOIN warehouse.dim_loan_officer o ON o.officer_id = a.assigned_officer_id;

INSERT INTO warehouse.fact_loan_disbursement (disbursement_id, loan_id, officer_key, date_key, disbursed_amount, disbursement_method)
SELECT d.disbursement_id, d.loan_id, o.officer_key, warehouse.fn_date_key(d.disbursement_date), d.disbursed_amount, d.disbursement_method
FROM warehouse.silver_loan_disbursements d JOIN warehouse.fact_loan l ON l.loan_id = d.loan_id
LEFT JOIN warehouse.dim_loan_officer o ON o.officer_id = d.authorized_by_officer_id;

INSERT INTO warehouse.fact_loan_repayment_schedule
SELECT s.schedule_id, s.loan_id, warehouse.fn_date_key(s.due_date), warehouse.fn_date_key(s.paid_date),
       s.installment_number, s.installment_amount, s.principal_component, s.interest_component, s.status
FROM warehouse.silver_loan_repayment_schedules s JOIN warehouse.fact_loan l ON l.loan_id = s.loan_id;

INSERT INTO warehouse.fact_loan_collateral
SELECT c.collateral_id, c.loan_id, warehouse.fn_date_key(c.valuation_date), c.collateral_type, c.valuation_amount, c.status
FROM warehouse.silver_loan_collaterals c JOIN warehouse.fact_loan l ON l.loan_id = c.loan_id;

INSERT INTO warehouse.fact_loan_guarantor
SELECT g.guarantor_id, g.loan_id, g.monthly_income, g.guarantee_amount, g.relationship_to_borrower
FROM warehouse.silver_loan_guarantors g JOIN warehouse.fact_loan l ON l.loan_id = g.loan_id;

INSERT INTO warehouse.fact_loan_fee
SELECT f.fee_id, f.loan_id, warehouse.fn_date_key(f.assessed_date), warehouse.fn_date_key(f.settled_date), f.fee_type, f.amount, f.status
FROM warehouse.silver_loan_fees_and_penalties f JOIN warehouse.fact_loan l ON l.loan_id = f.loan_id;

INSERT INTO warehouse.fact_loan_recovery_action
SELECT r.action_id, r.loan_id, o.officer_key, warehouse.fn_date_key(r.action_date),
       warehouse.fn_date_key(r.next_followup_date), r.action_type
FROM warehouse.silver_loan_recovery_actions r JOIN warehouse.fact_loan l ON l.loan_id = r.loan_id
LEFT JOIN warehouse.dim_loan_officer o ON o.officer_id = r.officer_id;

INSERT INTO warehouse.fact_loan_audit
SELECT a.audit_id, a.loan_id, warehouse.fn_date_key(DATE(a.modified_at)), a.action_type,
       a.old_status, a.new_status, a.old_amount, a.new_amount, a.old_interest_rate, a.new_interest_rate
FROM warehouse.silver_loan_audit_log a JOIN warehouse.fact_loan l ON l.loan_id = a.loan_id;

INSERT INTO warehouse.fact_loan_payment_audit
SELECT a.audit_id, a.payment_id, a.loan_id, warehouse.fn_date_key(DATE(a.modified_at)),
       a.action_type, a.old_amount, a.new_amount, a.old_status, a.new_status
FROM warehouse.silver_loan_payment_audit_log a JOIN warehouse.fact_loan l ON l.loan_id = a.loan_id;

COMMIT;
CALL warehouse.sp_log_etl_run('GOLD', 'SUCCESS', @gold_started_at, NOW(), 'Gold load completed');
CALL warehouse.sp_validate_gold_layer();
