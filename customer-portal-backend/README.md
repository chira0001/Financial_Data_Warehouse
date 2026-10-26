# Customer Portal Backend

Standalone Express API for the customer loan portal. It serves the customer-loan and ADBMS endpoints and connects to the `banking_loan_source` MySQL database created by [Bank_Loans.sql](../sources/MySQL-DB/Bank_Loans.sql).

## Run locally

```powershell
cd customer-portal-backend
Copy-Item .env.example .env
npm install
npm run dev
```

The API listens on `http://127.0.0.1:4001` by default. The customer portal's Vite server proxies `/api` requests to this service. Keep the warehouse backend on port `4000`; it remains the API for the visualization frontend.
