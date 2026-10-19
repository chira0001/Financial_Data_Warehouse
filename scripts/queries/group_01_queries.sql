-- Group 01: Transaction operations

-- Q01. Total transaction count and reporting-currency value.
SELECT COUNT(*) AS transaction_count, SUM(lkr_amount) AS total_lkr_amount
FROM warehouse.fact_transaction;

-- Q02. Transaction count and value by year and month.
SELECT d.calendar_year, d.calendar_month, COUNT(*) AS transaction_count, SUM(f.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction f JOIN warehouse.dim_date d ON d.date_key = f.date_key
GROUP BY d.calendar_year, d.calendar_month ORDER BY d.calendar_year, d.calendar_month;

-- Q03. Deposits, withdrawals, and payments by transaction type.
SELECT transaction_type, COUNT(*) AS transaction_count, SUM(lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction GROUP BY transaction_type ORDER BY lkr_amount DESC;

-- Q04. Transaction activity by channel.
SELECT channel, COUNT(*) AS transaction_count, SUM(lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction GROUP BY channel ORDER BY transaction_count DESC;