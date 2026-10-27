delimiter &&
DROP PROCEDURE IF EXISTS warehouse.gold_build&&
create procedure warehouse.gold_build()
begin
	CREATE TABLE IF NOT EXISTS warehouse.dim_date (
		date_key INT PRIMARY KEY,
		full_date DATE NOT NULL UNIQUE,
		calendar_year SMALLINT NOT NULL,
		calendar_quarter TINYINT NOT NULL,
		calendar_month TINYINT NOT NULL,
		month_name VARCHAR(20) NOT NULL,
		day_of_month TINYINT NOT NULL,
		day_of_week TINYINT NOT NULL,
		day_name VARCHAR(20) NOT NULL,
		week_of_year TINYINT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS warehouse.dim_currency (
		currency_key INT AUTO_INCREMENT PRIMARY KEY,
		currency_code CHAR(3) NOT NULL UNIQUE,
		is_reporting_currency BOOLEAN NOT NULL DEFAULT FALSE
	);

	CREATE TABLE IF NOT EXISTS warehouse.dim_branch (
		branch_key INT AUTO_INCREMENT PRIMARY KEY,
		branch_id VARCHAR(50) NOT NULL UNIQUE,
		branch_name VARCHAR(50),
		city VARCHAR(50),
		province VARCHAR(50)
	);

	CREATE TABLE IF NOT EXISTS warehouse.dim_customer (
		customer_key INT AUTO_INCREMENT PRIMARY KEY,
		customer_id VARCHAR(50) NOT NULL UNIQUE,
		first_name VARCHAR(50),
		last_name VARCHAR(50),
		gender VARCHAR(50),
		date_of_birth DATE,
		city VARCHAR(50),
		occupation VARCHAR(50)
	);

	CREATE TABLE IF NOT EXISTS warehouse.dim_account (
		account_key INT AUTO_INCREMENT PRIMARY KEY,
		account_id VARCHAR(50) NOT NULL UNIQUE,
		customer_id VARCHAR(50),
		branch_id VARCHAR(50),
		account_type VARCHAR(50),
		opening_date DATE,
		balance DECIMAL(10, 2)
	);

	CREATE TABLE IF NOT EXISTS warehouse.fact_transaction (
		transaction_key BIGINT AUTO_INCREMENT PRIMARY KEY,
		transaction_id VARCHAR(50) NOT NULL UNIQUE,
		date_key INT NOT NULL,
		account_key INT,
		customer_key INT,
		branch_key INT,
		currency_key INT,
		transaction_type VARCHAR(50),
		amount DECIMAL(18, 2),
		lkr_amount DECIMAL(18, 2),
		channel VARCHAR(50),
		description VARCHAR(100),
		FOREIGN KEY (date_key) REFERENCES warehouse.dim_date(date_key),
		FOREIGN KEY (account_key) REFERENCES warehouse.dim_account(account_key),
		FOREIGN KEY (customer_key) REFERENCES warehouse.dim_customer(customer_key),
		FOREIGN KEY (branch_key) REFERENCES warehouse.dim_branch(branch_key),
		FOREIGN KEY (currency_key) REFERENCES warehouse.dim_currency(currency_key)
	);

	CREATE TABLE IF NOT EXISTS warehouse.fact_exchange_rate (
		exchange_rate_key BIGINT AUTO_INCREMENT PRIMARY KEY,
		date_key INT NOT NULL,
		currency_key INT NOT NULL,
		base_currency CHAR(3) NOT NULL,
		rate DECIMAL(18, 6) NOT NULL,
		UNIQUE KEY uq_exchange_rate_date_currency (date_key, currency_key),
		FOREIGN KEY (date_key) REFERENCES warehouse.dim_date(date_key),
		FOREIGN KEY (currency_key) REFERENCES warehouse.dim_currency(currency_key)
	);

	CREATE TABLE IF NOT EXISTS warehouse.fact_loan (
		loan_id INT PRIMARY KEY,
		customer_key INT,
		account_key INT,
		start_date_key INT,
		end_date_key INT,
		loan_type VARCHAR(50),
		loan_amount DECIMAL(15, 2),
		interest_rate DECIMAL(5, 2),
		loan_status VARCHAR(30),
		FOREIGN KEY (customer_key) REFERENCES warehouse.dim_customer(customer_key),
		FOREIGN KEY (account_key) REFERENCES warehouse.dim_account(account_key),
		FOREIGN KEY (start_date_key) REFERENCES warehouse.dim_date(date_key),
		FOREIGN KEY (end_date_key) REFERENCES warehouse.dim_date(date_key)
	);

	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_payment (
		payment_id INT PRIMARY KEY,
		loan_id INT NOT NULL,
		date_key INT,
		payment_amount DECIMAL(15, 2),
		payment_method VARCHAR(30),
		payment_status VARCHAR(30),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id),
		FOREIGN KEY (date_key) REFERENCES warehouse.dim_date(date_key)
	);

	CREATE TABLE IF NOT EXISTS warehouse.dim_loan_product (
		product_key INT AUTO_INCREMENT PRIMARY KEY, product_id VARCHAR(10) NOT NULL UNIQUE,
		product_code VARCHAR(20), product_name VARCHAR(100), loan_category VARCHAR(50),
		min_amount DECIMAL(15,2), max_amount DECIMAL(15,2), base_interest_rate DECIMAL(5,2),
		max_tenure_months INT, is_collateral_required BOOLEAN, processing_fee_percentage DECIMAL(4,2)
	);
	CREATE TABLE IF NOT EXISTS warehouse.dim_loan_officer (
		officer_key INT AUTO_INCREMENT PRIMARY KEY, officer_id INT NOT NULL UNIQUE,
		employee_code VARCHAR(20), branch_id VARCHAR(10), role_title VARCHAR(50), status VARCHAR(20)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_application (
		application_id INT PRIMARY KEY, customer_key INT, product_key INT, officer_key INT,
		application_date_key INT, approval_date_key INT, applied_amount DECIMAL(15,2), approved_amount DECIMAL(15,2),
		requested_tenure_months INT, credit_score INT, approval_status VARCHAR(30),
		FOREIGN KEY (customer_key) REFERENCES warehouse.dim_customer(customer_key),
		FOREIGN KEY (product_key) REFERENCES warehouse.dim_loan_product(product_key),
		FOREIGN KEY (officer_key) REFERENCES warehouse.dim_loan_officer(officer_key),
		FOREIGN KEY (application_date_key) REFERENCES warehouse.dim_date(date_key),
		FOREIGN KEY (approval_date_key) REFERENCES warehouse.dim_date(date_key)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_disbursement (
		disbursement_id INT PRIMARY KEY, loan_id INT, officer_key INT, date_key INT,
		disbursed_amount DECIMAL(15,2), disbursement_method VARCHAR(50),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id),
		FOREIGN KEY (officer_key) REFERENCES warehouse.dim_loan_officer(officer_key),
		FOREIGN KEY (date_key) REFERENCES warehouse.dim_date(date_key)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_repayment_schedule (
		schedule_id INT PRIMARY KEY, loan_id INT, due_date_key INT, paid_date_key INT,
		installment_number INT, installment_amount DECIMAL(15,2), principal_component DECIMAL(15,2),
		interest_component DECIMAL(15,2), status VARCHAR(20),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id),
		FOREIGN KEY (due_date_key) REFERENCES warehouse.dim_date(date_key),
		FOREIGN KEY (paid_date_key) REFERENCES warehouse.dim_date(date_key)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_collateral (
		collateral_id INT PRIMARY KEY, loan_id INT, valuation_date_key INT, collateral_type VARCHAR(50),
		valuation_amount DECIMAL(15,2), status VARCHAR(30),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id),
		FOREIGN KEY (valuation_date_key) REFERENCES warehouse.dim_date(date_key)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_guarantor (
		guarantor_id INT PRIMARY KEY, loan_id INT, monthly_income DECIMAL(15,2), guarantee_amount DECIMAL(15,2),
		relationship_to_borrower VARCHAR(50),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_fee (
		fee_id INT PRIMARY KEY, loan_id INT, assessed_date_key INT, settled_date_key INT,
		fee_type VARCHAR(50), amount DECIMAL(15,2), status VARCHAR(20),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id),
		FOREIGN KEY (assessed_date_key) REFERENCES warehouse.dim_date(date_key),
		FOREIGN KEY (settled_date_key) REFERENCES warehouse.dim_date(date_key)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_recovery_action (
		action_id INT PRIMARY KEY, loan_id INT, officer_key INT, action_date_key INT,
		next_followup_date_key INT, action_type VARCHAR(50),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id),
		FOREIGN KEY (officer_key) REFERENCES warehouse.dim_loan_officer(officer_key),
		FOREIGN KEY (action_date_key) REFERENCES warehouse.dim_date(date_key),
		FOREIGN KEY (next_followup_date_key) REFERENCES warehouse.dim_date(date_key)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_audit (
		audit_id BIGINT PRIMARY KEY, loan_id INT, date_key INT, action_type VARCHAR(30),
		old_status VARCHAR(30), new_status VARCHAR(30), old_amount DECIMAL(15,2), new_amount DECIMAL(15,2),
		old_interest_rate DECIMAL(5,2), new_interest_rate DECIMAL(5,2),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id),
		FOREIGN KEY (date_key) REFERENCES warehouse.dim_date(date_key)
	);
	CREATE TABLE IF NOT EXISTS warehouse.fact_loan_payment_audit (
		audit_id BIGINT PRIMARY KEY, payment_id INT, loan_id INT, date_key INT, action_type VARCHAR(30),
		old_amount DECIMAL(15,2), new_amount DECIMAL(15,2), old_status VARCHAR(30), new_status VARCHAR(30),
		FOREIGN KEY (loan_id) REFERENCES warehouse.fact_loan(loan_id),
		FOREIGN KEY (date_key) REFERENCES warehouse.dim_date(date_key)
	);
end&&
delimiter ;

call warehouse.gold_build();
