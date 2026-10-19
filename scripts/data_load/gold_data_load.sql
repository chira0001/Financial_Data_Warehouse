SET @gold_started_at = NOW();
CALL warehouse.sp_log_etl_run('GOLD', 'RUNNING', @gold_started_at, NULL, 'Gold load started');
START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM warehouse.fact_loan_payment;
DELETE FROM warehouse.fact_loan;
DELETE FROM warehouse.fact_exchange_rate;
DELETE FROM warehouse.fact_transaction;
DELETE FROM warehouse.dim_account;
DELETE FROM warehouse.dim_customer;
DELETE FROM warehouse.dim_branch;
DELETE FROM warehouse.dim_currency;
DELETE FROM warehouse.dim_date;

SET FOREIGN_KEY_CHECKS = 1;
SET SESSION cte_max_recursion_depth = 20000;

INSERT INTO warehouse.dim_date (
    date_key, full_date, calendar_year, calendar_quarter, calendar_month,
    month_name, day_of_month, day_of_week, day_name, week_of_year
)
WITH RECURSIVE date_series AS (
    SELECT DATE('2020-01-01') AS full_date
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

COMMIT;
CALL warehouse.sp_log_etl_run('GOLD', 'SUCCESS', @gold_started_at, NOW(), 'Gold load completed');
CALL warehouse.sp_validate_gold_layer();