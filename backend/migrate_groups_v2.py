import sqlite3
import os

db_path = 'c:/Users/PC/Desktop/dd/backend/instance/app.db'
if not os.path.exists(db_path):
    # Try different location if necessary
    db_path = 'c:/Users/PC/Desktop/dd/backend/app.db'

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE assignment_groups ADD COLUMN max_members INTEGER DEFAULT 5")
    print("Added max_members to assignment_groups table.")
except sqlite3.OperationalError as e:
    print(f"Column might already exist or error: {e}")

conn.commit()
conn.close()
print("Migration complete.")
