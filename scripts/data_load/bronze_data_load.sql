/*
Load the Bronze Layer

This procedure initiates the data loading process for the Bronze Layer of the Financial Data Warehouse. 
Before execution, ensure that all required CSV files and Python scripts are available at their configured file locations.

The Python scripts must be executed explicitly through the Windows Command Prompt (CMD), 
as MySQL stored procedures cannot directly execute external Python scripts or use LOAD DATA statements within stored procedures.

Verify the file paths, database connections, and required permissions before starting the process to ensure that data is loaded successfully from the source files, 
database tables, and external APIs into the corresponding Bronze Layer tables.

Note: This process may truncate existing Bronze Layer data before reloading. 
Ensure that the source data is accessible and valid before execution.
*/

-- Run in CMD
-- python -u "e:\E Drive\University Project\L3S2\Financial_Data_Warehouse\sources\API\fetch_rates.py"

TRUNCATE warehouse.bronze_accounts;
LOAD DATA LOCAL INFILE
'E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV/accounts.csv'
INTO TABLE warehouse.bronze_accounts
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(account_id, customer_id, account_type, branch_id, opening_date, balance);

TRUNCATE warehouse.bronze_banking_transactions;
LOAD DATA LOCAL INFILE
'E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV/banking_transactions.csv'
INTO TABLE warehouse.bronze_banking_transactions
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(transaction_id, account_id, transaction_date, transaction_type, amount, channel, description);

TRUNCATE warehouse.bronze_branches;
LOAD DATA LOCAL INFILE
'E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV/branches.csv'
INTO TABLE warehouse.bronze_branches
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(branch_id, branch_name, city, province);

TRUNCATE warehouse.bronze_customers;
LOAD DATA LOCAL INFILE
'E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV/customers.csv'
INTO TABLE warehouse.bronze_customers
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(customer_id, customer_name, gender, date_of_birth, city, occupation);

TRUNCATE warehouse.bronze_loan_payments;
INSERT INTO warehouse.bronze_loan_payments SELECT * FROM banking_loan_source.loan_payments;

TRUNCATE warehouse.bronze_loans;
INSERT INTO warehouse.bronze_loans SELECT * FROM banking_loan_source.loans;