
DELIMITER &&
DROP PROCEDURE IF EXISTS warehouse.bronze_layer_tables&&
create procedure warehouse.bronze_layer_tables() 
BEGIN
	CREATE TABLE IF NOT EXISTS warehouse.bronze_accounts(
		account_id varchar(50),
		customer_id varchar(50),	
		account_type varchar(50),
		branch_id varchar(50),
		opening_date varchar(50),
		balance decimal(10,2)
	);

	CREATE TABLE IF NOT EXISTS warehouse.bronze_banking_transactions(
		transaction_id varchar(50),
		account_id varchar(50),
		transaction_date varchar(50),
		transaction_type varchar(50),
		amount varchar(50),
		channel	varchar(50),
		description varchar(100),
        currency char(3)
	);

	CREATE TABLE IF NOT EXISTS warehouse.bronze_branches(
		branch_id varchar(50),
		branch_name	varchar(50),
		city varchar(50),
		province varchar(50)
	);

	CREATE TABLE IF NOT EXISTS warehouse.bronze_customers(
		customer_id	varchar(50),
		customer_name varchar(100),
		gender varchar(50),
		date_of_birth varchar(50),	
		city varchar(50),
		occupation varchar(50)
	);

	CREATE TABLE IF NOT EXISTS warehouse.bronze_loans (
		loan_id INT PRIMARY KEY,
		customer_id INT NOT NULL,
		account_id INT,
		loan_type VARCHAR(50),
		loan_amount DECIMAL(15,2),
		interest_rate DECIMAL(5,2),
		loan_start_date varchar(50),
		loan_end_date varchar(50),
		loan_status VARCHAR(30)
	);

	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_payments (
		payment_id INT PRIMARY KEY,
		loan_id INT NOT NULL,
		payment_date varchar(50),
		payment_amount DECIMAL(15,2),
		payment_method VARCHAR(30),
		payment_status VARCHAR(30)
	);

	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_products LIKE banking_loan_source.loan_products;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_officers LIKE banking_loan_source.loan_officers;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_applications LIKE banking_loan_source.loan_applications;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_collaterals LIKE banking_loan_source.loan_collaterals;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_guarantors LIKE banking_loan_source.loan_guarantors;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_disbursements LIKE banking_loan_source.loan_disbursements;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_repayment_schedules LIKE banking_loan_source.loan_repayment_schedules;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_fees_and_penalties LIKE banking_loan_source.loan_fees_and_penalties;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_recovery_actions LIKE banking_loan_source.loan_recovery_actions;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_audit_log LIKE banking_loan_source.loan_audit_log;
	CREATE TABLE IF NOT EXISTS warehouse.bronze_loan_payment_audit_log LIKE banking_loan_source.loan_payment_audit_log;

	CREATE TABLE IF NOT EXISTS warehouse.bronze_exchange_rates (
		id INT NOT NULL AUTO_INCREMENT UNIQUE,
		rate_date varchar(50) NOT NULL,
		base_currency CHAR(3) NOT NULL,
		target_currency CHAR(3) NOT NULL,
		rate DECIMAL(18, 6) NOT NULL
	);
END&&
DELIMITER ;

CALL warehouse.bronze_layer_tables();
