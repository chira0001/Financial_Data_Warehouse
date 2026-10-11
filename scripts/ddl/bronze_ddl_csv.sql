create table bronze.accounts(
account_id varchar(50),
customer_id varchar(50),	
account_type varchar(50),
branch_id varchar(50),
opening_date date,
balance decimal(10,2)
);

create table bronze.banking_transactions(
transaction_id varchar(50),
account_id varchar(50),
transaction_date varchar(50),
transaction_type varchar(50),
amount varchar(50),
channel	varchar(50),
description varchar(100)
);

create table bronze.branches(
branch_id varchar(50),
branch_name	varchar(50),
city varchar(50),
province varchar(50)
);

create table bronze.customers(
customer_id	varchar(50),
customer_name varchar(100),
gender varchar(50),
date_of_birth date,	
city varchar(50),
occupation varchar(50)
);

create table bronze.loans (
    loan_id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    account_id INT,
    loan_type VARCHAR(50),
    loan_amount DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    loan_start_date DATE,
    loan_end_date DATE,
    loan_status VARCHAR(30)
);

create table bronze.loan_payments (
    payment_id INT PRIMARY KEY,
    loan_id INT NOT NULL,
    payment_date DATE,
    payment_amount DECIMAL(15,2),
    payment_method VARCHAR(30),
    payment_status VARCHAR(30),
);

create table bronze.exchange_rates (
	id INT NOT NULL AUTO_INCREMENT UNIQUE,
    rate_date DATE NOT NULL,
    base_currency CHAR(3) NOT NULL,
    target_currency CHAR(3) NOT NULL,
    rate DECIMAL(18, 6) NOT NULL
);