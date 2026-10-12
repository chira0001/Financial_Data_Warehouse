select * from warehouse.bronze_banking_transactions;

select * from warehouse.bronze_branches;

select * from warehouse.bronze_accounts;
select * from warehouse.bronze_customers;
select distinct 
case
	when account_type = 'Fixed Deposit' then 'FD'
    else account_type
end as account_type
from warehouse.bronze_accounts;

select *, date(opening_date) from warehouse.bronze_accounts;

SELECT *,
       STR_TO_DATE(opening_date, '%c/%e/%Y') AS formatted_date
FROM warehouse.bronze_accounts;

select branch_id from warehouse.bronze_branches where branch_id not in (
select branch_id from warehouse.bronze_accounts 
);

select * from warehouse.bronze_customers where customer_id not in (
select customer_id from warehouse.bronze_accounts 
);

select * from warehouse.bronze_accounts where customer_id not in (
select customer_id from warehouse.bronze_customers
);

select branch_id from warehouse.bronze_branches where branch_id not in (
select branch_id from warehouse.bronze_accounts 
);

select
	account_id,
    customer_id,
    account_type,
    case
		when account_type = 'Fixed Deposit' then 'FD'
		else account_type
	end as account_type,
    branch_id,
    -- opening_date,
    STR_TO_DATE(opening_date, '%c/%e/%Y') AS formatted_date,
    balance
from warehouse.bronze_accounts where account_type = 'Fixed Deposit';

select * from warehouse.bronze_exchange_rates;

select ac.account_id, tr.account_id from warehouse.bronze_accounts ac join warehouse.bronze_banking_transactions tr on ac.account_id = tr.account_id; 

select * from warehouse.bronze_banking_transactions;
select count(customer_id) from warehouse.bronze_accounts group by customer_id having count(customer_id) > 1;

select * from warehouse.bronze_banking_transactions where currency = 'USD';

SELECT
    t.transaction_id,
    t.account_id,
    STR_TO_DATE(t.transaction_date, '%c/%e/%Y') AS transaction_date,
    t.transaction_type,
    t.amount,
    COALESCE(
        ROUND(
			t.amount * (
            SELECT er.rate
            FROM warehouse.bronze_exchange_rates AS er
            WHERE er.rate_date <= STR_TO_DATE(t.transaction_date, '%c/%e/%Y')
              AND er.target_currency = t.currency
            ORDER BY er.rate_date DESC
            LIMIT 1
        ),
        2
        ),
        0
    ) AS lkr_amount,
    t.channel,
    t.description,
    t.currency
FROM warehouse.bronze_banking_transactions AS t
ORDER BY STR_TO_DATE(t.transaction_date, '%c/%e/%Y');
    
    select * from warehouse.bronze_exchange_rates where target_currency = 'NIO' order by date(rate_date);
    select currency from warehouse.bronze_banking_transactions;
    
    select 
        rate
    from warehouse.bronze_exchange_rates
    where rate_date = '2026-01-01' and target_currency = 'NIO'
    ;
    
    select branch_id from warehouse.silver_accounts where branch_id not in (
    select branch_id from warehouse.bronze_branches 
    );
    
    select * from warehouse.bronze_branches;
    
    create table if not exists warehouse.silver_branches(
		branch_id varchar(50) primary key,
        branch_name varchar(50),
        city varchar(50),
        province varchar(50)
    );

select 
	branch_id,
    branch_name,
    city,
    province
from warehouse.bronze_branches;    

select * from warehouse.bronze_customers;
select distinct occupation from warehouse.bronze_customers;
select count(customer_id) from warehouse.bronze_customers group by customer_id having count(customer_id) > 1;
    
select
	customer_id,
    SUBSTRING_INDEX(TRIM(customer_name), ' ', 1) AS first_name,
        CASE 
        WHEN INSTR(TRIM(customer_name), ' ') > 0 
        THEN SUBSTRING(TRIM(customer_name), INSTR(TRIM(customer_name), ' ') + 1)
        ELSE NULL 
    END AS last_name,
    gender,
    date(date_of_birth) as date_of_birth,
    city,
    occupation
from warehouse.bronze_customers;

select * from warehouse.bronze_loans;
select * from warehouse.silver_accounts;

select
	loan_id,
	case
		when customer_id < 10 then concat('C000', customer_id)
        when customer_id < 100 then concat('C00', customer_id)
        when customer_id < 1000 then concat('C0', customer_id)
        else concat('C', customer_id)
    end as new_cus_id,
    case
		when account_id < 10 then concat('A0000', account_id)
        when account_id < 100 then concat('A000', account_id)
        when account_id < 1000 then concat('A00', account_id)
        when account_id < 10000 then concat('A0', account_id)
        else concat('A', customer_id)
    end as new_acc_id,
    loan_type,
    loan_amount,
    interest_rate,
    date(loan_start_date) as loan_start_date,
    date(loan_end_date) as loan_end_date,
    loan_status
from warehouse.bronze_loans;

SELECT 
    loan_id,
    CONCAT('C', LPAD(customer_id, GREATEST(4, LENGTH(customer_id)), '0')) AS new_cus_id,
    CONCAT('A', LPAD(account_id, GREATEST(5, LENGTH(account_id)), '0'))  AS new_acc_id,
    loan_type,
    loan_amount,
    interest_rate,
    DATE(loan_start_date) AS loan_start_date,
    DATE(loan_end_date)   AS loan_end_date,
    loan_status
FROM warehouse.bronze_loans;

select distinct loan_status from warehouse.bronze_loans;

select * from warehouse.silver_loans;
select * from warehouse.bronze_loan_payments;

select
	payment_id,
    loan_id,
    date(payment_date) as payment_date,
	payment_amount,
    payment_method,
    payment_status
from warehouse.bronze_loan_payments;




    