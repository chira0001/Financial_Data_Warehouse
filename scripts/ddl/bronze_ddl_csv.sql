/*
Creation of Bronze Layer Tables

This procedure creates the required tables in the Bronze Layer of the Financial Data Warehouse to store raw data ingested from source systems,
 CSV files, banking databases, and external APIs.

The procedure uses CREATE TABLE IF NOT EXISTS to ensure that tables are created only when they do not already exist, 
preventing errors caused by attempting to recreate existing tables.

The Bronze Layer includes tables for accounts, banking transactions, branches, customers, loans, loan payments, and exchange rates. 
These tables serve as the initial data storage layer, preserving source data for subsequent data cleaning, validation, transformation, and loading into the Silver
and Gold Layers.

Execution:
Call the warehouse.bronze_layer_tables() stored procedure to create all required Bronze Layer tables.

Note: Existing tables are not modified if they already exist. Any changes to their schemas must be handled separately.
*/

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