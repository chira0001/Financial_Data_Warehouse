-- Group 05: Exposure, quality, and maturity risk

-- Q17. Customer loan exposure.
SELECT c.customer_id, CONCAT_WS(' ', c.first_name, c.last_name) AS customer_name, COUNT(l.loan_id) AS loan_count, SUM(l.loan_amount) AS exposure
FROM warehouse.fact_loan l JOIN warehouse.dim_customer c ON c.customer_key = l.customer_key
GROUP BY c.customer_id, customer_name ORDER BY exposure DESC;

-- Q18. Overdue loans and their payment totals.
SELECT l.loan_id, l.loan_amount, l.interest_rate, COALESCE(SUM(p.payment_amount), 0) AS payments_received
FROM warehouse.fact_loan l LEFT JOIN warehouse.fact_loan_payment p ON p.loan_id = l.loan_id
WHERE l.loan_status = 'Overdue' GROUP BY l.loan_id, l.loan_amount, l.interest_rate ORDER BY l.loan_amount DESC;

-- Q19. Transactions with unresolved Gold dimension relationships.
SELECT COUNT(*) AS unresolved_transaction_count
FROM warehouse.fact_transaction
WHERE date_key IS NULL OR account_key IS NULL OR customer_key IS NULL OR branch_key IS NULL OR currency_key IS NULL;

-- Q20. Active loans maturing within the next twelve months.
SELECT l.loan_id, l.customer_key, l.account_key, l.loan_amount, d.full_date AS loan_end_date
FROM warehouse.fact_loan l JOIN warehouse.dim_date d ON d.date_key = l.end_date_key
WHERE l.loan_status = 'Active'
  AND d.full_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 12 MONTH)
ORDER BY d.full_date;