# Apex Commercial Bank PLC — Retail Credit Subsystem & OLTP Portal
**Module:** Advanced Database Management Systems (ADBMS) — Final Capstone Project  
**Subsystem:** Operational Retail Loan Processing & Customer Self-Service Portal  
**Student Branch:** `Isuru` (Role: Retail Credit Subsystem & Operational UI Lead)

---

## 1. System Architecture: OLTP vs. OLAP Separation

In modern enterprise financial systems, operational transactions and analytical business intelligence operate on distinct database tiers to avoid analytical locking, preserve ACID compliance, and guarantee sub-millisecond response times.

```
+-------------------------------------------------------------------------+
|                  CUSTOMER LOAN PORTAL (Port 5174)                       |
|           React 19 + Vite • Responsive High-Fidelity UI                 |
+------------------------------------+------------------------------------+
                                     | REST API Calls (/api/customer/loans/*)
                                     v
+------------------------------------+------------------------------------+
|             CUSTOMER PORTAL API BACKEND (Port 4001)                     |
|             Express.js • Connection Pooling • MySQL2 Driver             |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                OLTP OPERATIONAL DATABASE (MySQL 8.0)                    |
|                   Schema: `banking_loan_source`                         |
|  * 3NF Normalized Schema                                                |
|  * High concurrency, row-level locking, ACID transactions                |
|  * Stored Procedures: `sp_disburse_new_loan`, `sp_process_loan_payment`  |
|  * Audit Log Ledger: `loan_audit_log`                                   |
+------------------------------------+------------------------------------+
                                     |
                                     | ETL Pipeline (Extract, Transform, Load)
                                     v
+-------------------------------------------------------------------------+
|                OLAP DATA WAREHOUSE (MySQL 8.0)                          |
|                       Schema: `warehouse`                               |
|  * Dimensional Star Schema (`dim_customer`, `dim_branch`, `fact_loan`)  |
|  * Analytical BI Dashboard (Port 5173)                                  |
+-------------------------------------------------------------------------+
```

---

## 2. Advanced Database Features Implemented (ADBMS Highlights)

### A. Stored Procedures & Transaction Control
1. **`banking_loan_source.sp_disburse_new_loan`**:
   - Executes multi-table relational inserts (`loans`, `accounts`, `loan_audit_log`) within an atomic transaction.
   - Enforces `DECLARE EXIT HANDLER FOR SQLEXCEPTION` with `ROLLBACK` to prevent orphan loan accounts.
   - Validates borrower CIF and branch identifier (`B001` - `B005`).

2. **`banking_loan_source.sp_process_loan_payment`**:
   - Handles real-time installment repayments.
   - Checks facility lifecycle state: Rejects payments on already `Closed` accounts with procedure code `ALREADY_CLOSED`.
   - Automatically transitions `loan_status` from `Active` to `Closed` once `balance_remaining <= 0`.
   - Records transaction receipts in `loan_payments` and state transitions in `loan_audit_log`.

### B. Change Data Capture & Audit Trails (`loan_audit_log`)
- Full compliance with Central Bank of Sri Lanka (CBSL) audit requirements.
- Tracks `action_type` (`DISBURSEMENT`, `PAYMENT`, `STATUS_CHANGE`), `old_status`, `new_status`, `new_amount`, `modified_by`, and timestamp.
- Inspected live in real time via the Customer Loan Portal's **Database Audit Trail** viewer.

### C. Stored Functions & Business Logic
- `fn_loan_outstanding_balance(p_loan_id)`: Calculates real-time remaining principal balance.
- `fn_calculate_monthly_emi(p_principal, p_rate, p_tenure)`: Computes fixed annuity monthly installments directly inside the database engine.

---

## 3. Customer Portal Feature Overview

| Feature | Description | ADBMS / Banking Highlight |
|---|---|---|
| **CBSL Product Catalog** | Dynamic catalog of 5 regulated facilities (`PERS-STD`, `HOME-PRM`, `AUTO-DRV`, `EDU-SCH`, `BIZ-GROW`). | Live query from `banking_loan_source.loan_products`. |
| **EMI Calculator & Amortization** | Interactive sliders with full month-by-month repayment schedule modal. | Compares client-side projection against DB annuity formulas. |
| **3-Step Application Wizard** | Online credit application with KYC verification and instant reference generation. | Calls `sp_disburse_new_loan` on MySQL backend. |
| **Self-Service Tracker** | Search by Facility ID or CIF with Quick Demo buttons (`#2001`, `#1001`, `#1005`, `#1010`). | Relational joins across `customers`, `loans`, and `loan_payments`. |
| **Audit Trail Inspector** | Visual ledger of all underlying MySQL audit rows and state transitions. | Direct read from `banking_loan_source.loan_audit_log`. |
| **Electronic Repayment Slip** | Execute installment payments and generate printable official payment vouchers. | Calls `sp_process_loan_payment` with print styling (`@media print`). |

---

## 4. API Endpoints Reference

The Customer Loan Portal communicates with the backend Express server over the following REST endpoints:

- `GET /api/customer/loans/products`: Returns regulated loan products from `loan_products`.
- `POST /api/customer/loans/apply`: Disburses new credit facility via `sp_disburse_new_loan`.
- `GET /api/customer/loans/lookup/:query`: Returns borrower profile, active facilities, payment history, and audit log entries.
- `POST /api/customer/loans/pay`: Processes installment repayment via `sp_process_loan_payment`.

---

## 5. Local Setup & Execution

### Prerequisites
- Node.js (v18+)
- MySQL Server 8.0 running on `localhost:3306` (with `banking_loan_source` and `warehouse` schemas loaded)

### Step 1: Start Backend API
```bash
cd customer-portal-backend
npm install
npm run dev
# API runs on http://127.0.0.1:4001
```

### Step 2: Start Customer Loan Portal
```bash
cd customer-portal
npm install
npm run dev
# Portal runs on http://localhost:5174
```

### Step 3: Start Internal BI Warehouse Dashboard (Optional)
```bash
cd visualization
npm install
npm run dev
# Dashboard runs on http://localhost:5173
```

---

## 6. Repository Standards & Branch Hygiene
- All changes in this module are maintained on the `Isuru` feature branch.
- Strictly isolated under `customer-portal/` with zero breaking modifications to teammates' files in `visualization/`, `scripts/`, or `sources/`.
- Clean merge compatibility maintained against `develop`.
