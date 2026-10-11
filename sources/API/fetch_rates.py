
import requests
import mysql.connector
from datetime import datetime

host = "localhost"
user = "root"
password = "1234"
database = "warehouse"
tableName = "bronze_exchange_rates"

start_year = 2026
end_year = datetime.now().year

url = "https://api.frankfurter.dev/v2/rates"

conn = None
cursor = None

createTableQuery = f"""
CREATE TABLE IF NOT EXISTS `{database}`.`{tableName}` (
    id INT NOT NULL AUTO_INCREMENT UNIQUE,
    rate_date DATE NOT NULL,
    base_currency CHAR(3) NOT NULL,
    target_currency CHAR(3) NOT NULL,
    rate DECIMAL(18, 6) NOT NULL
)
"""

query = f"""
INSERT IGNORE INTO `{database}`.`{tableName}`
(rate_date, base_currency, target_currency, rate)
VALUES (%s, %s, %s, %s)
"""

try:
    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database
    )

    cursor = conn.cursor()
    cursor.execute(createTableQuery)
    cursor.execute(f"TRUNCATE TABLE `{database}`.`{tableName}`")

    with requests.Session() as session:
        for year in range(start_year, end_year + 1):
            start_date = f"{year}-01-01"

            end_date = min(
                datetime.now().date(),
                datetime(year, 12, 31).date()
            ).isoformat()

            print(f"Fetching rates for {year}...")

            params = {
                "base": "LKR",
                "from": start_date,
                "to": end_date
            }

            response = session.get(
                url,
                params=params,
                timeout=30
            )
            response.raise_for_status()

            data = response.json()

            if not isinstance(data, list):
                raise ValueError(
                    f"Unexpected API response: {data}"
                )

            rows = []

            for item in data:
                rows.append((
                    item["date"],
                    "LKR",
                    item["quote"],
                    item["rate"]
                ))

            if rows:
                cursor.executemany(query, rows)
                conn.commit()

            print(
                f"Loaded {len(rows)} exchange rates for {year}."
            )

    print("All exchange rate data loaded successfully!")

except (
    requests.RequestException,
    mysql.connector.Error,
    ValueError,
    KeyError,
    TypeError
) as e:
    if conn and conn.is_connected():
        conn.rollback()

    print(f"ETL failed: {e}")

finally:
    if cursor:
        cursor.close()

    if conn and conn.is_connected():
        conn.close()
