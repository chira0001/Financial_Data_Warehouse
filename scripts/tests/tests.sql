



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
