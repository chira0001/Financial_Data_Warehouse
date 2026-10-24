/*
Load the Bronze Layer

This script loads source CSV files and banking database tables into Bronze tables.
The backend replaces {{PROJECT_ROOT}} with the repository root before executing it.

Note: This process may truncate existing Bronze Layer data before reloading. 
Ensure that the source data is accessible and valid before execution.
*/

SET @bronze_started_at = NOW();
CALL warehouse.sp_log_etl_run('BRONZE', 'RUNNING', @bronze_started_at, NULL, 'Bronze load started');
START TRANSACTION;

DELETE FROM warehouse.bronze_accounts;
LOAD DATA LOCAL INFILE '{{PROJECT_ROOT}}/sources/CSV/accounts.csv'
INTO TABLE warehouse.bronze_accounts
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(account_id, customer_id, account_type, branch_id, opening_date, balance);

DELETE FROM warehouse.bronze_banking_transactions;
LOAD DATA LOCAL INFILE '{{PROJECT_ROOT}}/sources/CSV/banking_transactions.csv'
INTO TABLE warehouse.bronze_banking_transactions
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(transaction_id, account_id, transaction_date, transaction_type, amount, channel, description, currency);

DELETE FROM warehouse.bronze_branches;
LOAD DATA LOCAL INFILE '{{PROJECT_ROOT}}/sources/CSV/branches.csv'
INTO TABLE warehouse.bronze_branches
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(branch_id, branch_name, city, province);

DELETE FROM warehouse.bronze_customers;
LOAD DATA LOCAL INFILE '{{PROJECT_ROOT}}/sources/CSV/customers.csv'
INTO TABLE warehouse.bronze_customers
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(customer_id, customer_name, gender, date_of_birth, city, occupation);

DELETE FROM warehouse.bronze_loan_payments;
INSERT INTO warehouse.bronze_loan_payments SELECT * FROM banking_loan_source.loan_payments;

DELETE FROM warehouse.bronze_loans;
INSERT INTO warehouse.bronze_loans SELECT * FROM banking_loan_source.loans;

COMMIT;
CALL warehouse.sp_log_etl_run('BRONZE', 'SUCCESS', @bronze_started_at, NOW(), 'Bronze load completed');
