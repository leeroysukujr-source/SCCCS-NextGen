import sqlite3
import os

db_path = 'c:/Users/PC/Desktop/dd/backend/instance/scccs.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE documents ADD COLUMN is_starred BOOLEAN DEFAULT 0")
    print("Added is_starred to documents table.")
except sqlite3.OperationalError as e:
    print(f"Column might already exist or error: {e}")

conn.commit()
conn.close()
print("Migration complete.")
