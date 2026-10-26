SET @silver_started_at = NOW();
CALL warehouse.sp_log_etl_run('SILVER', 'RUNNING', @silver_started_at, NULL, 'Silver load started');
START TRANSACTION;

DELETE FROM warehouse.silver_accounts;
insert into warehouse.silver_accounts
	select
		account_id,
		customer_id,
		account_type,
		branch_id,
		STR_TO_DATE(opening_date, '%c/%e/%Y') AS formatted_date,
		balance
	from warehouse.bronze_accounts;
    
DELETE FROM warehouse.silver_exchange_rates;
insert into warehouse.silver_exchange_rates
    select
		id,
		date(rate_date),
		target_currency,
		rate
	from warehouse.bronze_exchange_rates;
    
DELETE FROM warehouse.silver_banking_transactions;
INSERT INTO warehouse.silver_banking_transactions (
    transction_id,
    account_id,
    transaction_date,
    transaction_type,
    amount,
    currency,
    lkr_amount,
    channel,
    description
)
WITH parsed_transactions AS (
    SELECT
        t.transaction_id,
        t.account_id,
        STR_TO_DATE(t.transaction_date, '%c/%e/%Y') AS transaction_date,
        t.transaction_type,
        t.amount,
        t.currency,
        t.channel,
        t.description
    FROM warehouse.bronze_banking_transactions AS t
),
exchange_rate_intervals AS (
    SELECT
        target_currency,
        rate,
        rate_date AS valid_from,
        LEAD(rate_date, 1, DATE '9999-12-31') OVER (
            PARTITION BY target_currency 
            ORDER BY rate_date ASC
        ) AS valid_to
    FROM warehouse.bronze_exchange_rates
)
SELECT
    t.transaction_id,
    t.account_id,
    t.transaction_date,
    t.transaction_type,
    CAST(t.amount AS DECIMAL(18, 2)),
    t.currency,
    warehouse.fn_lkr_amount(t.amount, t.currency, er.rate) AS lkr_amount,
    t.channel,
    t.description
FROM parsed_transactions t
LEFT JOIN exchange_rate_intervals er
    ON  t.currency = er.target_currency
    AND t.transaction_date >= er.valid_from
    AND t.transaction_date < er.valid_to;

DELETE FROM warehouse.silver_branches;
insert into warehouse.silver_branches
	select 
		branch_id,
		branch_name,
		city,
		province
	from warehouse.bronze_branches;
    
DELETE FROM warehouse.silver_customers;
insert into warehouse.silver_customers
	select
		customer_id,
		SUBSTRING_INDEX(TRIM(customer_name), ' ', 1) AS first_name,
			CASE 
			WHEN INSTR(TRIM(customer_name), ' ') > 0 
			THEN SUBSTRING(TRIM(customer_name), INSTR(TRIM(customer_name), ' ') + 1)
			ELSE NULL 
		END AS last_name,
		gender,
		date(date_of_birth) as date_of_birth,
		city,
		occupation
	from warehouse.bronze_customers;
    
DELETE FROM warehouse.silver_loans;
insert into warehouse.silver_loans
    SELECT 
    loan_id,
    CONCAT('C', LPAD(customer_id, GREATEST(4, LENGTH(customer_id)), '0')) AS new_cus_id,
    CONCAT('A', LPAD(account_id, GREATEST(5, LENGTH(account_id)), '0'))  AS new_acc_id,
    loan_type,
    loan_amount,
    interest_rate,
    DATE(loan_start_date) AS loan_start_date,
    DATE(loan_end_date)   AS loan_end_date,
    loan_status
FROM warehouse.bronze_loans;

DELETE FROM warehouse.silver_loan_payments;
insert into warehouse.silver_loan_payments
	select
		payment_id,
		loan_id,
		date(payment_date) as payment_date,
		payment_amount,
		payment_method,
		payment_status
	from warehouse.bronze_loan_payments;

COMMIT;
CALL warehouse.sp_log_etl_run('SILVER', 'SUCCESS', @silver_started_at, NOW(), 'Silver load completed');
