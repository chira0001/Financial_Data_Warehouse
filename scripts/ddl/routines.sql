CREATE TABLE IF NOT EXISTS warehouse.etl_run_log (
    run_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    layer_name VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    message VARCHAR(500) NULL
);

DELIMITER $$

DROP FUNCTION IF EXISTS warehouse.fn_date_key$$
CREATE FUNCTION warehouse.fn_date_key(input_date DATE)
RETURNS INT
DETERMINISTIC
NO SQL
BEGIN
    RETURN CASE
        WHEN input_date IS NULL THEN NULL
        ELSE DATE_FORMAT(input_date, '%Y%m%d') + 0
    END;
END$$

DROP FUNCTION IF EXISTS warehouse.fn_lkr_amount$$
CREATE FUNCTION warehouse.fn_lkr_amount(
    input_amount DECIMAL(18, 2),
    input_currency CHAR(3),
    exchange_rate DECIMAL(18, 6)
)
RETURNS DECIMAL(18, 2)
DETERMINISTIC
NO SQL
BEGIN
    RETURN CASE
        WHEN input_amount IS NULL THEN NULL
        WHEN input_currency = 'LKR' THEN ROUND(input_amount, 2)
        WHEN exchange_rate IS NULL THEN 0
        ELSE ROUND(input_amount * exchange_rate, 2)
    END;
END$$

DROP PROCEDURE IF EXISTS warehouse.sp_log_etl_run$$
CREATE PROCEDURE warehouse.sp_log_etl_run(
    IN input_layer_name VARCHAR(20),
    IN input_status VARCHAR(20),
    IN input_started_at DATETIME,
    IN input_completed_at DATETIME,
    IN input_message VARCHAR(500)
)
MODIFIES SQL DATA
BEGIN
    INSERT INTO warehouse.etl_run_log (
        layer_name, status, started_at, completed_at, message
    )
    VALUES (
        input_layer_name,
        input_status,
        input_started_at,
        input_completed_at,
        input_message
    );
END$$

DROP PROCEDURE IF EXISTS warehouse.sp_validate_gold_layer$$
CREATE PROCEDURE warehouse.sp_validate_gold_layer()
READS SQL DATA
BEGIN
    SELECT 'transaction_count' AS check_name,
           (SELECT COUNT(*) FROM warehouse.silver_banking_transactions) AS silver_count,
           (SELECT COUNT(*) FROM warehouse.fact_transaction) AS gold_count,
           (SELECT COUNT(*) FROM warehouse.silver_banking_transactions)
             = (SELECT COUNT(*) FROM warehouse.fact_transaction) AS passed
    UNION ALL
    SELECT 'loan_payment_count',
           (SELECT COUNT(*) FROM warehouse.silver_loan_payments),
           (SELECT COUNT(*) FROM warehouse.fact_loan_payment),
           (SELECT COUNT(*) FROM warehouse.silver_loan_payments)
             = (SELECT COUNT(*) FROM warehouse.fact_loan_payment)
    UNION ALL
    SELECT 'transaction_dimension_keys',
           COUNT(*),
           0,
           COUNT(*) = 0
    FROM warehouse.fact_transaction
    WHERE date_key IS NULL OR account_key IS NULL OR currency_key IS NULL;
END$$

DELIMITER ;