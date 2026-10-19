-- Gold row-count checks
SELECT 'dim_customer' AS table_name, COUNT(*) AS row_count FROM warehouse.dim_customer
UNION ALL SELECT 'dim_account', COUNT(*) FROM warehouse.dim_account
UNION ALL SELECT 'dim_branch', COUNT(*) FROM warehouse.dim_branch
UNION ALL SELECT 'dim_date', COUNT(*) FROM warehouse.dim_date
UNION ALL SELECT 'dim_currency', COUNT(*) FROM warehouse.dim_currency
UNION ALL SELECT 'fact_transaction', COUNT(*) FROM warehouse.fact_transaction
UNION ALL SELECT 'fact_exchange_rate', COUNT(*) FROM warehouse.fact_exchange_rate
UNION ALL SELECT 'fact_loan', COUNT(*) FROM warehouse.fact_loan
UNION ALL SELECT 'fact_loan_payment', COUNT(*) FROM warehouse.fact_loan_payment;

-- Fact grain checks. Each query should return zero rows.
SELECT transaction_id, COUNT(*) AS duplicate_count
FROM warehouse.fact_transaction
GROUP BY transaction_id
HAVING COUNT(*) > 1;

SELECT date_key, currency_key, COUNT(*) AS duplicate_count
FROM warehouse.fact_exchange_rate
GROUP BY date_key, currency_key
HAVING COUNT(*) > 1;

SELECT payment_id, COUNT(*) AS duplicate_count
FROM warehouse.fact_loan_payment
GROUP BY payment_id
HAVING COUNT(*) > 1;

-- Relationship checks. These should return zero rows.
SELECT transaction_id
FROM warehouse.fact_transaction
WHERE account_key IS NULL OR date_key IS NULL OR currency_key IS NULL;

SELECT payment_id
FROM warehouse.fact_loan_payment
WHERE loan_id IS NULL OR date_key IS NULL;

-- Source-to-Gold reconciliation checks.
SELECT
    (SELECT COUNT(*) FROM warehouse.silver_banking_transactions) AS silver_transactions,
    (SELECT COUNT(*) FROM warehouse.fact_transaction) AS gold_transactions;

SELECT
    (SELECT COUNT(*) FROM warehouse.silver_loan_payments) AS silver_payments,
    (SELECT COUNT(*) FROM warehouse.fact_loan_payment) AS gold_payments;