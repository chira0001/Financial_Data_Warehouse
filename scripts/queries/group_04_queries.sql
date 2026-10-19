-- Group 04: Interest rates and loan payments

-- Q13. Highest-interest loan facilities.
SELECT loan_id, loan_type, loan_amount, interest_rate, loan_status
FROM warehouse.fact_loan ORDER BY interest_rate DESC, loan_amount DESC LIMIT 20;

-- Q14. Loan payments by payment status.
SELECT payment_status, COUNT(*) AS payment_count, SUM(payment_amount) AS payment_total
FROM warehouse.fact_loan_payment GROUP BY payment_status ORDER BY payment_total DESC;

-- Q15. Loan payments by payment method.
SELECT payment_method, COUNT(*) AS payment_count, SUM(payment_amount) AS payment_total
FROM warehouse.fact_loan_payment GROUP BY payment_method ORDER BY payment_total DESC;

-- Q16. Monthly loan payment totals.
SELECT d.calendar_year, d.calendar_month, COUNT(*) AS payment_count, SUM(p.payment_amount) AS payment_total
FROM warehouse.fact_loan_payment p JOIN warehouse.dim_date d ON d.date_key = p.date_key
GROUP BY d.calendar_year, d.calendar_month ORDER BY d.calendar_year, d.calendar_month;