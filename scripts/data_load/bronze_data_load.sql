

SET @bronze_started_at = NOW();
CALL warehouse.sp_log_etl_run('BRONZE', 'RUNNING', @bronze_started_at, NULL, 'Bronze load started');
START TRANSACTION;

DELETE FROM warehouse.bronze_accounts;
LOAD DATA LOCAL INFILE
'E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV/accounts.csv'
INTO TABLE warehouse.bronze_accounts
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(account_id, customer_id, account_type, branch_id, opening_date, balance);

DELETE FROM warehouse.bronze_banking_transactions;
LOAD DATA LOCAL INFILE
'E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV/banking_transactions.csv'
INTO TABLE warehouse.bronze_banking_transactions
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(transaction_id, account_id, transaction_date, transaction_type, amount, channel, description, currency);

DELETE FROM warehouse.bronze_branches;
LOAD DATA LOCAL INFILE
'E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV/branches.csv'
INTO TABLE warehouse.bronze_branches
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(branch_id, branch_name, city, province);

DELETE FROM warehouse.bronze_customers;
LOAD DATA LOCAL INFILE
'E:/E Drive/University Project/L3S2/Financial_Data_Warehouse/sources/CSV/customers.csv'
INTO TABLE warehouse.bronze_customers
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(customer_id, customer_name, gender, date_of_birth, city, occupation);

INSERT INTO warehouse.bronze_branches (branch_id, branch_name, city, province)
SELECT b.branch_id, b.branch_name, b.city, b.province
FROM banking_loan_source.branches b
WHERE NOT EXISTS (SELECT 1 FROM warehouse.bronze_branches x WHERE x.branch_id = b.branch_id);

INSERT INTO warehouse.bronze_customers (customer_id, customer_name, gender, date_of_birth, city, occupation)
SELECT CONCAT('C', LPAD(c.customer_id, GREATEST(4, LENGTH(c.customer_id)), '0')),
       c.customer_name, c.gender, c.date_of_birth, c.city, c.occupation
FROM banking_loan_source.customers c
WHERE NOT EXISTS (
    SELECT 1 FROM warehouse.bronze_customers x
    WHERE x.customer_id = CONCAT('C', LPAD(c.customer_id, GREATEST(4, LENGTH(c.customer_id)), '0'))
);

DELETE FROM warehouse.bronze_loan_payments;
INSERT INTO warehouse.bronze_loan_payments SELECT * FROM banking_loan_source.loan_payments;

DELETE FROM warehouse.bronze_loans;
INSERT INTO warehouse.bronze_loans SELECT * FROM banking_loan_source.loans;

DELETE FROM warehouse.bronze_loan_products;
INSERT INTO warehouse.bronze_loan_products SELECT * FROM banking_loan_source.loan_products;
DELETE FROM warehouse.bronze_loan_officers;
INSERT INTO warehouse.bronze_loan_officers SELECT * FROM banking_loan_source.loan_officers;
DELETE FROM warehouse.bronze_loan_applications;
INSERT INTO warehouse.bronze_loan_applications SELECT * FROM banking_loan_source.loan_applications;
DELETE FROM warehouse.bronze_loan_collaterals;
INSERT INTO warehouse.bronze_loan_collaterals SELECT * FROM banking_loan_source.loan_collaterals;
DELETE FROM warehouse.bronze_loan_guarantors;
INSERT INTO warehouse.bronze_loan_guarantors SELECT * FROM banking_loan_source.loan_guarantors;
DELETE FROM warehouse.bronze_loan_disbursements;
INSERT INTO warehouse.bronze_loan_disbursements SELECT * FROM banking_loan_source.loan_disbursements;
DELETE FROM warehouse.bronze_loan_repayment_schedules;
INSERT INTO warehouse.bronze_loan_repayment_schedules SELECT * FROM banking_loan_source.loan_repayment_schedules;
DELETE FROM warehouse.bronze_loan_fees_and_penalties;
INSERT INTO warehouse.bronze_loan_fees_and_penalties SELECT * FROM banking_loan_source.loan_fees_and_penalties;
DELETE FROM warehouse.bronze_loan_recovery_actions;
INSERT INTO warehouse.bronze_loan_recovery_actions SELECT * FROM banking_loan_source.loan_recovery_actions;
DELETE FROM warehouse.bronze_loan_audit_log;
INSERT INTO warehouse.bronze_loan_audit_log SELECT * FROM banking_loan_source.loan_audit_log;
DELETE FROM warehouse.bronze_loan_payment_audit_log;
INSERT INTO warehouse.bronze_loan_payment_audit_log SELECT * FROM banking_loan_source.loan_payment_audit_log;

COMMIT;
CALL warehouse.sp_log_etl_run('BRONZE', 'SUCCESS', @bronze_started_at, NOW(), 'Bronze load completed');
