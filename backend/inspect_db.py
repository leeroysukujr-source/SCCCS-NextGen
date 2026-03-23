import sqlite3
import os

db_path = os.path.join('instance', 'scccs.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [r[0] for r in cursor.fetchall()]

for table in tables:
    print(f"Table: {table}")
    cursor.execute(f"PRAGMA table_info({table});")
    for col in cursor.fetchall():
        print(f"  {col[1]} ({col[2]})")

conn.close()
