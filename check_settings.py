import sqlite3
import os

db_path = os.path.join("backend", "instance", "scccs.db")
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM system_settings WHERE key LIKE '%SUPABASE%' OR key LIKE '%S3%';")
        rows = cursor.fetchall()
        for row in rows:
            print(f"{row[0]}: {row[1]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
