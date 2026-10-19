CREATE OR REPLACE VIEW warehouse.vw_transaction_detail AS
SELECT
    fact.transaction_id,
    date_dim.full_date AS transaction_date,
    customer.customer_id,
    CONCAT_WS(' ', customer.first_name, customer.last_name) AS customer_name,
    account.account_id,
    account.account_type,
    branch.branch_id,
    branch.branch_name,
    currency.currency_code,
    fact.transaction_type,
    fact.amount,
    fact.lkr_amount,
    fact.channel,
    fact.description
FROM warehouse.fact_transaction fact
JOIN warehouse.dim_date date_dim ON date_dim.date_key = fact.date_key
LEFT JOIN warehouse.dim_account account ON account.account_key = fact.account_key
LEFT JOIN warehouse.dim_customer customer ON customer.customer_key = fact.customer_key
LEFT JOIN warehouse.dim_branch branch ON branch.branch_key = fact.branch_key
LEFT JOIN warehouse.dim_currency currency ON currency.currency_key = fact.currency_key;

CREATE OR REPLACE VIEW warehouse.vw_daily_transaction_summary AS
SELECT
    date_dim.full_date AS transaction_date,
    currency.currency_code,
    fact.transaction_type,
    COUNT(*) AS transaction_count,
    SUM(fact.amount) AS transaction_amount,
    SUM(fact.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction fact
JOIN warehouse.dim_date date_dim ON date_dim.date_key = fact.date_key
LEFT JOIN warehouse.dim_currency currency ON currency.currency_key = fact.currency_key
GROUP BY date_dim.full_date, currency.currency_code, fact.transaction_type;

CREATE OR REPLACE VIEW warehouse.vw_loan_portfolio AS
SELECT
    loan.loan_id,
    customer.customer_id,
    CONCAT_WS(' ', customer.first_name, customer.last_name) AS customer_name,
    account.account_id,
    loan.loan_type,
    loan.loan_amount,
    loan.interest_rate,
    start_date.full_date AS loan_start_date,
    end_date.full_date AS loan_end_date,
    loan.loan_status,
    COALESCE(SUM(payment.payment_amount), 0) AS total_payments
FROM warehouse.fact_loan loan
LEFT JOIN warehouse.dim_customer customer ON customer.customer_key = loan.customer_key
LEFT JOIN warehouse.dim_account account ON account.account_key = loan.account_key
LEFT JOIN warehouse.dim_date start_date ON start_date.date_key = loan.start_date_key
LEFT JOIN warehouse.dim_date end_date ON end_date.date_key = loan.end_date_key
LEFT JOIN warehouse.fact_loan_payment payment ON payment.loan_id = loan.loan_id
GROUP BY
    loan.loan_id,
    customer.customer_id,
    customer.first_name,
    customer.last_name,
    account.account_id,
    loan.loan_type,
    loan.loan_amount,
    loan.interest_rate,
    start_date.full_date,
    end_date.full_date,
    loan.loan_status;