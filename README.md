# Financial Data Warehouse

Synthetic banking data warehouse with a MySQL Bronze/Silver/Gold pipeline, a Node.js API, and a Vite React operations dashboard.

All included datasets are synthetic and intended for academic use. They do not contain real customer or bank data.

## Project Structure

```text
Financial_Data_Warehouse/
├── backend/                 Node.js + Express + MySQL API
├── customer-portal-backend/  Node.js + Express API for the loan portal
├── customer-portal/          Vite + React customer loan portal
├── scripts/
│   ├── ddl/                 Bronze, Silver, Gold, routines, and views
│   ├── data_load/           Layer load scripts
│   └── tests/               Warehouse and Gold validation queries
├── sources/
│   ├── API/                 Foreign-exchange API loader
│   ├── CSV/                 Core banking and transaction extracts
│   └── MySQL-DB/            Loan source database dump
└── visualization/           Vite + React warehouse control room
```

## Data Sources

1. Core banking CSV extracts: customers, accounts, and branches.
2. Banking transaction CSV extract covering January to September 2026.
3. Loan and loan-payment source database in [Bank_Loans.sql](sources/MySQL-DB/Bank_Loans.sql).
4. Foreign-exchange rates retrieved from the Frankfurter REST API by [fetch_rates.py](sources/API/fetch_rates.py).

## Warehouse Layers

### Bronze

Raw landing tables preserve source values before transformation:

`bronze_customers`, `bronze_accounts`, `bronze_branches`, `bronze_banking_transactions`, `bronze_exchange_rates`, `bronze_loans`, and `bronze_loan_payments`.

### Silver

Cleaned and typed tables parse dates, preserve transaction currency and amount, calculate reporting currency, split customer names, and standardize loan relationships.

### Gold

The analytical star schema contains:

- Dimensions: `dim_customer`, `dim_account`, `dim_branch`, `dim_date`, `dim_currency`
- Facts: `fact_transaction`, `fact_exchange_rate`, `fact_loan`, `fact_loan_payment`
- Views: `vw_transaction_detail`, `vw_daily_transaction_summary`, `vw_loan_portfolio`

Database functions, procedures, and ETL audit logging are defined in [routines.sql](scripts/ddl/routines.sql). Triggers and automatic database events are intentionally not used because the warehouse is batch-loaded and should not refresh Gold while source data is incomplete.

## Prerequisites

- MySQL 8.0 or later
- Node.js 18 or later
- Python 3 with `requests` and `mysql-connector-python` for the FX loader
- MySQL client available on `PATH`, or use MySQL Workbench to run the SQL files

## Database Setup

From the repository root, create the databases:

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS warehouse;"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS banking_loan_source;"
```

Load the loan source database:

```powershell
mysql -u root -p < sources/MySQL-DB/Bank_Loans.sql
```

Create warehouse tables and database objects in this order:

```powershell
mysql -u root -p warehouse < scripts/ddl/bronze_ddl_csv.sql
mysql -u root -p warehouse < scripts/ddl/routines.sql
mysql -u root -p warehouse < scripts/ddl/silver_ddl_csv.sql
mysql -u root -p warehouse < scripts/ddl/gold_ddl.sql
mysql -u root -p warehouse < scripts/ddl/reporting_views.sql
```

Before loading, update the CSV paths in [bronze_data_load.sql](scripts/data_load/bronze_data_load.sql) for your machine. Configure the database connection in [fetch_rates.py](sources/API/fetch_rates.py), then fetch the exchange rates:

```powershell
python sources/API/fetch_rates.py
```

Load the layers manually when needed:

```powershell
mysql -u root -p warehouse < scripts/data_load/bronze_data_load.sql
mysql -u root -p warehouse < scripts/data_load/silver_data_load.sql
mysql -u root -p warehouse < scripts/data_load/gold_data_load.sql
```

Run validation queries:

```powershell
mysql -u root -p warehouse < scripts/tests/tests.sql
mysql -u root -p warehouse < scripts/tests/gold_tests.sql
```

## Backend API

The backend reads warehouse data and runs the existing ETL scripts for the dashboard.

```powershell
cd backend
Copy-Item .env.example .env
```

Set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, and `FRONTEND_ORIGIN` in `backend/.env`, then run:

```powershell
npm install
npm run dev
```

The API runs at `http://127.0.0.1:4000` and provides:

- `GET /api/health`
- `GET /api/warehouse/overview`
- `GET /api/warehouse/transactions?search=`
- `GET /api/warehouse/loans`
- `GET /api/warehouse/quality`
- `POST /api/query-groups/:groupId/run` where `groupId` is `1` through `5`
- `POST /api/pipeline/run`

The pipeline endpoint executes Bronze, Silver, and Gold loading in order and returns an error if MySQL or any ETL statement fails.

The warehouse API on port `4000` is dedicated to the visualization dashboard. The customer portal uses its own backend on port `4001`:

```powershell
cd customer-portal-backend
Copy-Item .env.example .env
# Set MYSQL_PASSWORD and any other local connection values in .env
npm install
npm run dev
```

The customer API defaults to the `banking_loan_source` database; the warehouse API remains configured for `warehouse`. The customer portal's Vite proxy forwards `/api` requests to port `4001`.

## React Visualization

In a second terminal:

```powershell
cd visualization
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` requests to the backend at port 4000.

The dashboard includes:

- Warehouse overview and layer health
- Transaction explorer
- Loan portfolio
- Data-quality results
- ETL run history
- Run pipeline control

The UI renders only records returned by the warehouse API. If MySQL is unavailable or the warehouse has no data, it displays an error or empty state instead of sample records.

## Validation

```powershell
cd visualization
npm run lint
npm run build
```

For a backend smoke test:

```powershell
Invoke-WebRequest http://127.0.0.1:4000/api/health
```

## Academic Deliverables

- [Final report](docs/FINAL_REPORT.md): submission-ready business, technical, modelling, implementation, and demonstration document.
- [Final report Word document](docs/FINAL_REPORT.docx): editable Microsoft Word version of the final report.
- [Project report](docs/PROJECT_REPORT.md): business context, technologies, architecture, ETL, quality, and demonstration plan.
- [Project report Word document](docs/PROJECT_REPORT.docx): editable Microsoft Word version of the project report.
- [Dimensional model](docs/DIMENSIONAL_MODEL.md): logical star schema, physical tables, keys, and fact grain.
- [Twenty business queries](scripts/queries/business_queries.sql): analytical questions covering transactions, customers, branches, currencies, loans, payments, and data quality.
- [Group 1 queries](scripts/queries/group_01_queries.sql), [Group 2 queries](scripts/queries/group_02_queries.sql), [Group 3 queries](scripts/queries/group_03_queries.sql), [Group 4 queries](scripts/queries/group_04_queries.sql), and [Group 5 queries](scripts/queries/group_05_queries.sql): four queries allocated to each group member.

Generate the query result output from the populated warehouse with:

```powershell
mysql -u root -p warehouse < scripts/queries/business_queries.sql > docs/business_query_results.txt
```

The result file must be generated after loading the real warehouse so the report contains actual query results rather than invented values.
