import sqlite3
import os

db_path = 'backend/instance/scccs.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM users")
        print(f"Users count: {cursor.fetchone()[0]}")
        cursor.execute("SELECT username, role, status FROM users")
        for row in cursor.fetchall():
            print(f"User: {row[0]}, Role: {row[1]}, Status: {row[2]}")
    except Exception as e:
        print(f"Error: {e}")
    conn.close()
