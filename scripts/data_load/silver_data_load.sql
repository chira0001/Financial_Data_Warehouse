truncate warehouse.silver_accounts;
insert into warehouse.silver_accounts
	select
		account_id,
		customer_id,
		account_type,
		branch_id,
		STR_TO_DATE(opening_date, '%c/%e/%Y') AS formatted_date,
		balance
	from warehouse.bronze_accounts;