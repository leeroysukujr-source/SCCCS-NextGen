import sqlite3
import os
db_path = 'backend/scccs.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.execute("PRAGMA table_info(files)")
    columns = [r[1] for r in cursor.fetchall()]
    print(f"File {db_path} exists and has columns: {columns}")
    conn.close()
else:
    print(f"File {db_path} NOT FOUND")
