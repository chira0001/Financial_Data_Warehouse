-- Group 03: Branch, customer, and loan portfolio

-- Q09. Accounts and balances by branch.
SELECT b.branch_name, COUNT(a.account_key) AS account_count, SUM(a.balance) AS total_balance
FROM warehouse.dim_account a JOIN warehouse.dim_branch b ON b.branch_id = a.branch_id
GROUP BY b.branch_key, b.branch_name ORDER BY total_balance DESC;

-- Q10. Customer distribution by occupation.
SELECT occupation, COUNT(*) AS customer_count
FROM warehouse.dim_customer GROUP BY occupation ORDER BY customer_count DESC;

-- Q11. Loan portfolio by loan type.
SELECT loan_type, COUNT(*) AS loan_count, SUM(loan_amount) AS principal, AVG(interest_rate) AS average_rate
FROM warehouse.fact_loan GROUP BY loan_type ORDER BY principal DESC;

-- Q12. Loan portfolio by status.
SELECT loan_status, COUNT(*) AS loan_count, SUM(loan_amount) AS principal
FROM warehouse.fact_loan GROUP BY loan_status ORDER BY principal DESC;