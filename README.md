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
- foreign_exchange_rates.csv : API-style historical USD exchange-rate data for EUR, GBP, JPY and LKR

Suggested warehouse:
Dimensions:
- dim_customer
- dim_account
- dim_branch
- dim_date
- dim_currency

Facts:
- fact_transaction
- fact_exchange_rate

Suggested staging tables:
- stg_customer
- stg_account
- stg_branch
- stg_transaction
- stg_exchange_rate

Important:
For the final report, describe Source 3 as data retrieved from a REST API and then saved as CSV
for staging/reproducibility if your lecturer requires CSV inputs. If your lecturer specifically
requires a live REST API as one of the three sources, keep the API step in your ETL and use this CSV
as a backup/test extract.
