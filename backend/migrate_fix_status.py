import sqlite3
import os

db_path = 'instance/scccs.db'
if not os.path.exists(db_path):
    db_path = 'scccs.db'

conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute("ALTER TABLE assignments ADD COLUMN status VARCHAR(20) DEFAULT 'draft'")
    print("Added status to assignments")
except Exception as e:
    print(f"Skipping status: {e}")

conn.commit()
conn.close()
