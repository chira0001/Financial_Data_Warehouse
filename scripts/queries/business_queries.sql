-- 01. Total transaction count and reporting-currency value.
SELECT COUNT(*) AS transaction_count, SUM(lkr_amount) AS total_lkr_amount
FROM warehouse.fact_transaction;

-- 02. Transaction count and value by year and month.
SELECT d.calendar_year, d.calendar_month, COUNT(*) AS transaction_count, SUM(f.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction f JOIN warehouse.dim_date d ON d.date_key = f.date_key
GROUP BY d.calendar_year, d.calendar_month ORDER BY d.calendar_year, d.calendar_month;

-- 03. Deposits, withdrawals, and payments by transaction type.
SELECT transaction_type, COUNT(*) AS transaction_count, SUM(lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction GROUP BY transaction_type ORDER BY lkr_amount DESC;

-- 04. Transaction activity by channel.
SELECT channel, COUNT(*) AS transaction_count, SUM(lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction GROUP BY channel ORDER BY transaction_count DESC;

-- 05. Transaction activity by currency.
SELECT c.currency_code, COUNT(*) AS transaction_count, SUM(f.amount) AS source_amount, SUM(f.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction f JOIN warehouse.dim_currency c ON c.currency_key = f.currency_key
GROUP BY c.currency_code ORDER BY lkr_amount DESC;

-- 06. Branch transaction performance.
SELECT b.branch_id, b.branch_name, COUNT(*) AS transaction_count, SUM(f.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction f JOIN warehouse.dim_branch b ON b.branch_key = f.branch_key
GROUP BY b.branch_id, b.branch_name ORDER BY lkr_amount DESC;

-- 07. Top customers by transaction value.
SELECT c.customer_id, CONCAT_WS(' ', c.first_name, c.last_name) AS customer_name, COUNT(*) AS transaction_count, SUM(f.lkr_amount) AS lkr_amount
FROM warehouse.fact_transaction f JOIN warehouse.dim_customer c ON c.customer_key = f.customer_key
GROUP BY c.customer_id, customer_name ORDER BY lkr_amount DESC;

-- 08. Account balances by account type.
SELECT account_type, COUNT(*) AS account_count, SUM(balance) AS total_balance, AVG(balance) AS average_balance
FROM warehouse.dim_account GROUP BY account_type ORDER BY total_balance DESC;

-- 09. Accounts and balances by branch.
SELECT b.branch_name, COUNT(a.account_key) AS account_count, SUM(a.balance) AS total_balance
FROM warehouse.dim_account a JOIN warehouse.dim_branch b ON b.branch_id = a.branch_id
GROUP BY b.branch_key, b.branch_name ORDER BY total_balance DESC;

-- 10. Customer distribution by occupation.
SELECT occupation, COUNT(*) AS customer_count
FROM warehouse.dim_customer GROUP BY occupation ORDER BY customer_count DESC;

-- 11. Loan portfolio by loan type.
SELECT loan_type, COUNT(*) AS loan_count, SUM(loan_amount) AS principal, AVG(interest_rate) AS average_rate
FROM warehouse.fact_loan GROUP BY loan_type ORDER BY principal DESC;

-- 12. Loan portfolio by status.
SELECT loan_status, COUNT(*) AS loan_count, SUM(loan_amount) AS principal
FROM warehouse.fact_loan GROUP BY loan_status ORDER BY principal DESC;

-- 13. Highest-interest loan facilities.
SELECT loan_id, loan_type, loan_amount, interest_rate, loan_status
FROM warehouse.fact_loan ORDER BY interest_rate DESC, loan_amount DESC;

-- 14. Loan payments by payment status.
SELECT payment_status, COUNT(*) AS payment_count, SUM(payment_amount) AS payment_total
FROM warehouse.fact_loan_payment GROUP BY payment_status ORDER BY payment_total DESC;

-- 15. Loan payments by payment method.
SELECT payment_method, COUNT(*) AS payment_count, SUM(payment_amount) AS payment_total
FROM warehouse.fact_loan_payment GROUP BY payment_method ORDER BY payment_total DESC;

-- 16. Monthly loan payment totals.
SELECT d.calendar_year, d.calendar_month, COUNT(*) AS payment_count, SUM(p.payment_amount) AS payment_total
FROM warehouse.fact_loan_payment p JOIN warehouse.dim_date d ON d.date_key = p.date_key
GROUP BY d.calendar_year, d.calendar_month ORDER BY d.calendar_year, d.calendar_month;

-- 17. Customer loan exposure.
SELECT c.customer_id, CONCAT_WS(' ', c.first_name, c.last_name) AS customer_name, COUNT(l.loan_id) AS loan_count, SUM(l.loan_amount) AS exposure
FROM warehouse.fact_loan l JOIN warehouse.dim_customer c ON c.customer_key = l.customer_key
GROUP BY c.customer_id, customer_name ORDER BY exposure DESC;

-- 18. Overdue loans and their payment totals.
SELECT l.loan_id, l.loan_amount, l.interest_rate, COALESCE(SUM(p.payment_amount), 0) AS payments_received
FROM warehouse.fact_loan l LEFT JOIN warehouse.fact_loan_payment p ON p.loan_id = l.loan_id
WHERE l.loan_status = 'Overdue' GROUP BY l.loan_id, l.loan_amount, l.interest_rate ORDER BY l.loan_amount DESC;

-- 19. Transactions with unresolved Gold dimension relationships.
SELECT COUNT(*) AS unresolved_transaction_count
FROM warehouse.fact_transaction
WHERE date_key IS NULL OR account_key IS NULL OR customer_key IS NULL OR branch_key IS NULL OR currency_key IS NULL;

-- 20. Active loans maturing within the next twelve months.
SELECT l.loan_id, l.customer_key, l.account_key, l.loan_amount, d.full_date AS loan_end_date
FROM warehouse.fact_loan l JOIN warehouse.dim_date d ON d.date_key = l.end_date_key
WHERE loan_status = 'Active'
  AND d.full_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 12 MONTH)
ORDER BY d.full_date;