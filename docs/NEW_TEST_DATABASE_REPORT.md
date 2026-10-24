# Banking Loan Management Database: Final System Report

**Reference source:** `new-test-database.sql`  
**Database platform declared by the source:** MySQL  
**Scope:** Loan origination, servicing, payments, collections, audit, and access roles

> This report is based only on `sources/MySQL-DB/new-test-database.sql`. Sections 3 and 4 are left for the author to complete. Application hosting and connection examples are recommendations because the SQL source does not contain an application server or application connection code.

## 1. Introduction

The SQL file defines a banking loan-management database named `banking_loan_source`. It starts with branch and customer master data, loan facilities, and loan payments. It extends these core records with a loan product catalogue, loan officers, application underwriting, collateral, guarantors, disbursements, repayment schedules, fees, recovery actions, and audit logs.

The database is intended to support the lifecycle of a loan: application and assessment, approval, disbursement, scheduled repayment, payment processing, maturity and delinquency monitoring, recovery, and audit. MySQL tables store the operational records. Functions calculate repayment and risk values. Triggers validate selected loan/payment inputs and record changes. Procedures carry out transaction-oriented operations, scheduled events automate an overdue check, views expose work queues and summaries, and roles grant different levels of access.

The SQL seed statements define 10 branches, 1,000 customers, 1,000 loans, and 1,000 loan-payment rows. They also seed products, staff, applications, collateral, guarantees, disbursements, repayment schedules, fees, recovery actions, and audit records. These are row counts declared by the inserts in the file, not a live database verification. The records appear synthetic; this report treats them as sample data rather than verified banking records.

## 2. Backend Solution

The reference file provides a database-side backend. It contains schema definitions and database logic, but does not define an HTTP API, web application, or application-server runtime. A client can call the MySQL procedures, query the operational views, or access the database under an assigned role.

The database logic supports these operations:

- Maintain branches, customers, loan products, officers, applications, loan facilities, and supporting loan records.
- Calculate monthly EMI, total interest, outstanding principal-based balance, days overdue, and a risk tier.
- Reject selected invalid loan and payment inserts using triggers.
- Record loan updates and payment insertions in audit tables.
- Disburse a loan, process a payment, restructure a facility, and batch-mark overdue loans through stored procedures.
- Evaluate active overdue facilities daily through a scheduled MySQL event.
- Present active facilities, collections work, customer loan summaries, payment reconciliation, and portfolio-health metrics through views.

The SQL creates three roles: `role_loan_officer`, `role_loan_manager`, and `role_loan_auditor`. It grants read and execute privileges for operational work, broader loan-management privileges, and read access to audit and reporting objects respectively. The file does not create named user accounts or assign these roles to users.

## 3. EER Diagram

**Reserved for author insertion.** No EER/ER diagram is included.

## 4. Relational Mapping

**Reserved for author insertion.** No relational mapping is included.

## 5. Table Structure

The source defines 15 tables. Primary-key and foreign-key details below are taken from the table definitions in the SQL file. Unless noted, a table has no foreign key declared in this source.

| Table | Main columns | Key details and purpose |
| --- | --- | --- |
| `branches` | `branch_id`, `branch_name`, `city`, `province` | PK: `branch_id`; branch master |
| `customers` | `customer_id`, `customer_code`, `customer_name`, `gender`, `date_of_birth`, `city`, `occupation`, `branch_id` | PK: `customer_id`; unique `customer_code`; FK `branch_id` to `branches` |
| `loans` | `loan_id`, `customer_id`, `account_id`, `loan_type`, `loan_amount`, `interest_rate`, `loan_start_date`, `loan_end_date`, `loan_status` | PK: `loan_id`; FK `customer_id` to `customers`; `account_id` has no FK in this file |
| `loan_payments` | `payment_id`, `loan_id`, `payment_date`, `payment_amount`, `payment_method`, `payment_status` | PK: `payment_id`; FK `loan_id` to `loans` |
| `loan_products` | `product_id`, `product_code`, `product_name`, `loan_category`, amount limits, base rate, maximum tenure, collateral flag, processing fee | PK: `product_id`; unique `product_code` |
| `loan_officers` | `officer_id`, employee code, names, email, phone, branch, role title, status | PK: `officer_id`; unique employee code/email; FK branch to `branches` |
| `loan_applications` | `application_id`, customer/product/officer IDs, requested and approved amounts, tenure, application/approval dates, credit score, status, notes | PK: `application_id`; FKs to customers, products, and officers |
| `loan_collaterals` | `collateral_id`, `loan_id`, type, description, valuation, valuation date, valuer, document reference, status | PK: `collateral_id`; FK to `loans` |
| `loan_guarantors` | `guarantor_id`, `loan_id`, name, NIC number, relationship, phone, income, employer, guarantee amount | PK: `guarantor_id`; FK to `loans` |
| `loan_disbursements` | `disbursement_id`, `loan_id`, date, amount, method, reference, authorizing officer | PK: `disbursement_id`; unique reference; FKs to loans and officers |
| `loan_repayment_schedules` | `schedule_id`, `loan_id`, installment number, due date, installment amount, principal and interest components, status, paid date | Auto-increment PK `schedule_id`; FK to `loans` |
| `loan_fees_and_penalties` | `fee_id`, `loan_id`, type, amount, assessment date, status, settlement date | PK: `fee_id`; FK to `loans` |
| `loan_recovery_actions` | `action_id`, `loan_id`, officer, action date/type, notes, borrower commitment, next follow-up date | PK: `action_id`; FKs to loans and officers |
| `loan_audit_log` | `audit_id`, `loan_id`, action, old/new status, old/new amount, old/new rate, user, timestamp, notes | Auto-increment PK; stores loan lifecycle changes |
| `loan_payment_audit_log` | `audit_id`, payment and loan IDs, action, old/new amount/status, user, timestamp, notes | Auto-increment PK; stores payment audit events |

The file also defines secondary B-tree indexes for common customer, branch, loan, application, payment, schedule, collateral, guarantor, disbursement, fee, recovery, and audit lookups. Most of these index columns match filtering or relationship fields used by the operational workflows.

## 6. Architecture of the Backend

```text
Loan officer / manager / auditor client
                 │
                 │ SQL query, view, function, or procedure call
                 ▼
       MySQL role and privilege checks
                 │
       ┌─────────┴───────────┐
       │                     │
 Operational tables    Views / functions
       │                     │
       ├── Triggers ─────────┤
       ├── Stored procedures ┤
       └── Daily event ──────┘
```

The source file uses a database-centered architecture. Tables persist the operational state. Constraints protect declared relationships and selected uniqueness rules. Triggers run validation or audit behavior close to data changes. Procedures encapsulate multi-step transactional operations. Functions expose reusable calculations. Views assemble rows for operational users and managers. MySQL roles are intended to restrict which operations each user category can perform.

The file itself does not define a separate backend service, network listener, REST endpoints, or connection pool. A production application would connect to MySQL and call the permitted database objects, but that application layer is outside the source file's scope.

## 7. Tools and Technologies

| Technology evidenced by the SQL source | Role in the database |
| --- | --- |
| MySQL | Database creation, tables, keys, indexes, roles, views, functions, procedures, triggers, and events |
| SQL | DDL, seed data, data integrity rules, calculations, transaction control, privileges, and verification queries |
| MySQL stored routines | Loan calculations and transaction-oriented loan operations |
| MySQL triggers | Loan/payment validation and audit recording |
| MySQL Event Scheduler | Daily overdue-facility evaluation |
| B-tree indexes | Lookup and filter performance on frequently used identifiers and statuses |

The SQL file does not specify a programming language, web framework, frontend, or cloud vendor. Those choices belong to an application implementation built around this database.

## 8. Hosting the Backend and Reasons for the Selection

The SQL source specifies MySQL, so the database backend should run on a MySQL-compatible server. A managed MySQL service is a reasonable hosting choice because this schema depends on MySQL-specific functions, stored procedures, triggers, views, roles, and the Event Scheduler. A self-managed MySQL server is another option when full control over global settings and server administration is required.

No host or cloud deployment is specified in the reference file. Before choosing a managed service, verify support for the required MySQL version, stored-program features, role grants, event scheduling, transaction behavior, backup/restore, and the privilege needed to create these objects. The source executes `SET GLOBAL event_scheduler = ON`, which may require administrator-level permission and may not be available to a restricted database account on a managed service. If the provider does not permit that setting, enable the scheduler through its supported configuration or move the daily overdue check to an external scheduler.

The workload contains customer identifiers and contact/financial information, so deployment should use private network access, encrypted connections, managed backups, least-privilege access, and a documented recovery plan. These are hosting recommendations, not configurations present in the SQL file.

## 9. Security Measures for Protecting the Database

### Controls present in the source

- Primary keys and selected unique constraints prevent duplicate identifiers and references.
- Foreign keys protect declared branch, customer, loan, product, officer, and payment relationships.
- The `trg_loans_before_insert` trigger rejects non-positive principal, invalid interest rates, invalid dates, unsupported loan types, and unsupported statuses.
- The `trg_loan_payments_before_insert` trigger rejects non-positive payments, invalid payment statuses, payments for missing loans, and payments against closed loans.
- Loan updates and payment insertions are recorded by audit triggers in dedicated audit tables.
- Separate officer, manager, and auditor roles receive different grants.

### Controls to add or verify before production

The file creates roles and grants permissions, but it does not create login users or issue `GRANT role_name TO user` assignments. An administrator must create named users, assign roles, and verify default-role behavior. Review the manager role's broad `SELECT ON banking_loan_source.*` privilege against actual duties. Restrict database network access, require TLS, protect credentials, back up the database, and monitor account activity.

The customer and guarantor tables contain identity, contact, financial, and employment fields. The SQL file does not configure encryption-at-rest, column masking, retention, anonymization, or application authentication. The sample records should not be treated as production-safe real personal data. Add privacy controls and retention rules before storing real customer data.

The DDL includes `SET GLOBAL event_scheduler = ON`, which should be run only by an authorized administrator. The import also drops and recreates routines/triggers/events in parts of the file and contains unguarded `CREATE INDEX` statements; executing the full script repeatedly requires a controlled migration/reset strategy.

## 10. Database Accounts/Users and Reasons for Creating Them

The reference defines roles, not named database users:

| Role in the file | Intended user group | Granted access |
| --- | --- | --- |
| `role_loan_officer` | Branch loan officers | Read loans, payments, and selected views; execute payment processing and selected calculation functions |
| `role_loan_manager` | Loan managers | Read/insert/update loan and payment records, read the schema, and execute disbursement, payment, restructuring, and overdue procedures |
| `role_loan_auditor` | Compliance auditors | Read audit logs and selected portfolio, collections, and reconciliation views |

The separation limits routine users to duties relevant to their work and gives auditors read access to audit/reporting objects. The SQL file does not contain `CREATE USER` statements or role-to-user assignment statements. A deployment must create individual accounts, assign only the relevant role, and avoid shared credentials. Use separate administrator credentials for schema deployment and avoid giving application users global privileges.

## 11. Code of the Database Connection

The SQL source does not contain application-side connection code, so no existing backend connection string can be reported from it. The command below is an illustrative way to connect a MySQL CLI client and import this file. Replace the host and account with values created by the database administrator; do not put the password into the command line.

```sh
mysql --host=<mysql-host> --port=3306 --user=<deployment-user> --password \
  banking_loan_source < sources/MySQL-DB/new-test-database.sql
```

An application would use the same host, port, database name, and assigned user through its MySQL driver and secret configuration. That application code is not included in the reference SQL file.

## 12. Code Snippets

### Loan insert validation

```sql
IF NEW.loan_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Loan amount must be greater than zero.';
END IF;

IF NEW.loan_end_date <= NEW.loan_start_date THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Maturity date must be after start date.';
END IF;
```

This illustrates database-side validation before a loan row is inserted.

### Monthly EMI calculation

```sql
SET v_monthly_rate = (p_annual_rate / 100.0) / 12.0;
SET v_factor = POW(1.0 + v_monthly_rate, p_tenure_months);
SET v_emi = ROUND(
    p_principal * v_monthly_rate * v_factor / (v_factor - 1.0), 2
);
```

The function handles invalid principal/tenure and zero interest before applying the standard amortizing-payment formula.

### Transactional payment processing

```sql
START TRANSACTION;

INSERT INTO loan_payments (
    payment_id, loan_id, payment_date,
    payment_amount, payment_method, payment_status
) VALUES (
    p_payment_id, p_loan_id, p_payment_date,
    p_payment_amount, p_payment_method, p_payment_status
);

COMMIT;
```

The full procedure also validates the loan state, payment amount, and duplicate payment identifier, and rolls back when an exception occurs.

### Role-based access

```sql
CREATE ROLE IF NOT EXISTS role_loan_auditor;
GRANT SELECT ON banking_loan_source.loan_audit_log
  TO role_loan_auditor;
GRANT SELECT ON banking_loan_source.loan_payment_audit_log
  TO role_loan_auditor;
```

The complete source grants additional read access to selected audit and reporting views.

## 13. Problems Faced During Development and Solutions

The SQL file does not include a development diary, so the points below are engineering considerations evident from its implementation rather than claims about documented events.

| Consideration | Evidence in the source | Recommended handling |
| --- | --- | --- |
| Large seed data makes imports and repeated setup costly. | Many insert statements seed 1,000 rows per operational table. | Separate schema migrations from seed loads, load in batches where necessary, and verify row counts after import. |
| The complete script is not fully rerunnable as-is. | `CREATE TABLE IF NOT EXISTS` is used, but bulk `INSERT` statements and numerous `CREATE INDEX` statements are unguarded. | Use a clean database for initial load or versioned migrations with checks and controlled seed-data behavior. |
| Scheduled processing needs server-level capability. | The file sets the global event scheduler and creates a daily event. | Obtain administrator approval, configure it through the host, or run the overdue procedure from an external scheduler. |
| Some relationships are not enforced in the schema. | `loans.account_id` has no declared FK; audit table IDs are not constrained by FKs. | Add constraints when a valid account table and desired retention rules are established, or document intentional historical references. |
| Role definitions are not enough to authenticate users. | Roles are created and granted privileges, but no user accounts or role assignments are defined. | Create individual accounts, assign roles, test grants with each role, and remove direct broad grants. |
| A stored calculation may simplify accounting. | Outstanding balance subtracts paid payment totals from original principal. | For real lending, calculate balances from an amortization ledger, fees, interest accrual, reversals, and payment allocation rules. |

## 14. Changes Needed to Host the Backend in a Cloud Environment

The SQL file is a database script rather than a deployable web backend. Cloud deployment would therefore involve provisioning MySQL and, if user-facing software is required, building and deploying a separate application service.

Before deployment:

1. Select a MySQL-compatible managed service or provision a secured MySQL server, and validate support for the routines, triggers, views, roles, and scheduled event used here.
2. Decide how to enable the daily event. The `SET GLOBAL` statement may not be available to the import account or on the selected service; configure the event scheduler through the provider or schedule the procedure externally.
3. Separate database creation/migrations from sample-data imports. Run schema changes with a deployment administrator and seed only non-production data.
4. Create named least-privilege users, assign the defined roles, rotate passwords, and store secrets outside source control.
5. Restrict MySQL to private network access from the application service and require encrypted client connections.
6. Configure backups, retention, point-in-time recovery, monitoring, and restore tests.
7. If adding an application API, configure its database settings through a secret manager, use parameterized statements, authorize users and routes, and avoid returning database errors to public clients.
8. Test the full workflow in a staging database, including procedure rollback, trigger validation, audit records, scheduled overdue processing, and role permissions.

## 15. Possibilities for Replacing the Relational Database with a Non-Relational Technology

The database depends on relational integrity and SQL transaction behavior. A non-relational design is possible, but the foreign keys, joins, constraints, procedures, triggers, audit tables, and roles would need equivalents in the new system or in application services.

- A **document database** could store a loan as a document with embedded repayment schedules, disbursements, and fee details. Customer, officer, and product data may be embedded or referenced, depending on update and reporting needs. Cross-loan reports and global customer/branch joins would require denormalized records or aggregation pipelines.
- A **key-value or wide-column store** could serve high-volume payment histories and account/loan timelines, partitioned by loan identifier and time. Query patterns would need to be known in advance; ad hoc joins would be harder.
- An **event store** could represent disbursements, payments, restructures, status transitions, and recovery actions as an immutable event sequence. Current loan state and audit history could be derived from those events, but event replay, ordering, idempotency, and correction events would need careful design.
- A **hybrid architecture** could keep the relational database for loan origination and payment transactions while copying analytical or search data to document, search, or data-lake services.

For the system described in this file, a wholesale replacement is not automatically beneficial. The foreign keys, transactional procedures, and role grants are central to its operation. A non-relational option becomes more compelling if scale or access patterns demand it and the team is prepared to rebuild integrity, transaction, audit, and reporting behavior.

## Scope Note

This report describes the SQL definitions, sample data, routines, privileges, and operational behavior declared in `new-test-database.sql`. The file alone cannot establish that the SQL has been executed successfully, that a scheduled event is active on a server, or that a separate application has been deployed.
