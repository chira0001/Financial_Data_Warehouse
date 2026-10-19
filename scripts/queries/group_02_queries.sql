-- Group 02: Currency, accounts, and customers

-- Q05. Transaction activity by currency.
SELECT c.currency_code, COUNT(*) AS transaction_count, SUM(f.amount) AS source_amount, SUM(f.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction f JOIN warehouse.dim_currency c ON c.currency_key = f.currency_key
GROUP BY c.currency_code ORDER BY lkr_amount DESC;

-- Q06. Branch transaction performance.
SELECT b.branch_id, b.branch_name, COUNT(*) AS transaction_count, SUM(f.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction f JOIN warehouse.dim_branch b ON b.branch_key = f.branch_key
GROUP BY b.branch_id, b.branch_name ORDER BY lkr_amount DESC;

-- Q07. Top customers by transaction value.
SELECT c.customer_id, CONCAT_WS(' ', c.first_name, c.last_name) AS customer_name, COUNT(*) AS transaction_count, SUM(f.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction f JOIN warehouse.dim_customer c ON c.customer_key = f.customer_key
GROUP BY c.customer_id, customer_name ORDER BY lkr_amount DESC LIMIT 20;

-- Q08. Account balances by account type.
SELECT account_type, COUNT(*) AS account_count, SUM(balance) AS total_balance, AVG(balance) AS average_balance
FROM warehouse.dim_account GROUP BY account_type ORDER BY total_balance DESC;