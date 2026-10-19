create table if not exists warehouse.silver_accounts(
	account_id varchar(50) primary key,
	customer_id varchar(50),	
	account_type varchar(50),
	branch_id varchar(50),
	opening_date date,
	balance decimal(10,2)
);

create table if not exists warehouse.silver_exchange_rates(
	id int primary key,
    rate_date date,
    target_currency char(3),
    rate decimal(18, 6)
);
create index idx_target_currency_rate_date on warehouse.silver_exchange_rates(target_currency,rate_date);
CREATE INDEX idx_exchange_rates ON warehouse.bronze_exchange_rates (target_currency, rate_date);

create table if not exists warehouse.silver_banking_transactions(
	transction_id varchar(50),
    account_id varchar(50),
    transaction_date date,
    transaction_type varchar(50),
    amount decimal(18, 2),
    currency char(3),
    lkr_amount decimal(18, 2),
    channel varchar(50),
    description varchar(50)
);
ALTER TABLE warehouse.silver_banking_transactions
    ADD COLUMN IF NOT EXISTS amount decimal(18, 2),
    ADD COLUMN IF NOT EXISTS currency char(3);
CREATE INDEX idx_bronze_txns ON warehouse.bronze_banking_transactions (currency);

create table if not exists warehouse.silver_branches(
	branch_id varchar(50) primary key,
	branch_name varchar(50),
	city varchar(50),
	province varchar(50)
);

create table if not exists warehouse.silver_customers(
	customer_id varchar(50),
    first_name varchar(50),
    last_name varchar(50),
    gender varchar(50),
    date_of_birth date,
    city varchar(50),
    occupation varchar(50)
);

create table if not exists warehouse.silver_loans(
	loan_id int primary key,
    customer_id varchar(50),
    account_id varchar(50),
    loan_type varchar(50),
    loan_amount decimal(15, 2),
    interest_rate decimal(5, 2),
    loan_start_date date,
    loan_end_date date,
    loan_status varchar(30)
);

create table if not exists warehouse.silver_loan_payments(
	payment_id int primary key,
    loan_id int,
    payment_date date,
    payment_amount decimal(15, 2),
    payment_method varchar(30),
    payment_status varchar(30)
);

