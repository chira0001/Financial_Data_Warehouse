import requests
import mysql.connector
from datetime import datetime

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="1234",
    database="banking_warehouse"
)

cursor = conn.cursor()

start_year = 2020
end_year = 2026

for year in range(start_year, end_year + 1):

    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"

    print(f"Fetching {year}...")

    url = f"https://api.frankfurter.dev/v1/{start_date}..{end_date}"

    response = requests.get(url)
    data = response.json()

    if "rates" not in data:
        continue

    for date, currencies in data["rates"].items():
        for currency, rate in currencies.items():

            query = """
            INSERT IGNORE INTO stg_exchange_rates
            (rate_date, base_currency, target_currency, rate)
            VALUES (%s, %s, %s, %s)
            """

            cursor.execute(query, (date, "EUR", currency, rate))

    conn.commit()

print("All historical data loaded!")

cursor.close()
conn.close()