# Financial_Data_Warehouse

BANKING DATA WAREHOUSE - SYNTHETIC CSV SOURCES

All datasets in this package are synthetic and created for an academic data warehousing project.
They do not contain real customer or bank data.

SOURCE 1 - Core Banking System (represented as CSV extracts)
- customers.csv       : customer master data
- accounts.csv        : bank account data
- branches.csv        : branch master data

SOURCE 2 - Banking Transaction System
- banking_transactions.csv : transaction-level data for Jan-Sep 2026

SOURCE 3 - Foreign Exchange REST API Extract
- `sources/API/fetch_rates.py` retrieves historical exchange rates and loads them into Bronze.

Implemented warehouse:

The warehouse uses Bronze and Silver layers for ingestion and transformation, followed by a Gold star schema for analytics.

Dimensions:
- dim_customer
- dim_account
- dim_branch
- dim_date
- dim_currency

Facts:
- fact_transaction
- fact_exchange_rate
- fact_loan
- fact_loan_payment

Bronze staging tables:
- bronze_customers
- bronze_accounts
- bronze_branches
- bronze_banking_transactions
- bronze_exchange_rates
- bronze_loans
- bronze_loan_payments

The Gold DDL is in `scripts/ddl/gold_ddl.sql` and the full-refresh Gold load is in
`scripts/data_load/gold_data_load.sql`. Run them after the Bronze and Silver layers
have been loaded.

Database routines and reporting views are defined in `scripts/ddl/routines.sql` and
`scripts/ddl/reporting_views.sql`. Execute them in this order:

1. `bronze_ddl_csv.sql`
2. `routines.sql`
3. `silver_ddl_csv.sql`
4. `gold_ddl.sql`
5. `bronze_data_load.sql`
6. `silver_data_load.sql`
7. `gold_data_load.sql`
8. `reporting_views.sql`

The warehouse uses batch ETL, so triggers and event listeners are intentionally not
used. Triggers would add row-by-row overhead during bulk loads, and an automatic event
could refresh Gold while source data is incomplete. Use the ETL scripts or an external
scheduler to control refresh timing.

Important:
For the final report, describe Source 3 as data retrieved from a REST API and loaded into Bronze
for reproducible warehouse processing. If CSV input is required, export the API response as a
backup/test extract while retaining the API step in the ETL.

Visualization API:

The React application uses the Node API in `backend/` to read MySQL and run the ETL pipeline.
Copy `backend/.env.example` to `backend/.env`, set the MySQL credentials, then run:

```powershell
cd backend
npm install
npm run dev
```

In another terminal, run the frontend:

```powershell
cd visualization
npm install
npm run dev
```

The frontend proxies `/api` requests to `http://127.0.0.1:4000`. The Run pipeline button
executes the Bronze, Silver, and Gold load scripts through the API and refreshes the views.
Without a successful MySQL connection, the UI shows an error or empty state and never uses
sample records.
