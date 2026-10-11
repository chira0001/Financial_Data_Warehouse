create table if not exists warehouse.silver_accounts(
	account_id varchar(50) primary key,
	customer_id varchar(50),	
	account_type varchar(50),
	branch_id varchar(50),
	opening_date date,
	balance decimal(10,2)
);