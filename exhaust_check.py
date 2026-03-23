import sqlite3
import os

def check_db(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='files'")
        row = cursor.fetchone()
        if row:
            cursor = conn.execute("PRAGMA table_info(files)")
            cols = [r[1] for r in cursor.fetchall()]
            print(f"DB: {db_path} -> files table HAS columns: {cols}")
        else:
            print(f"DB: {db_path} -> files table NOT FOUND")
        conn.close()
    except Exception as e:
        print(f"DB: {db_path} -> Error: {e}")

for root, dirs, files in os.walk('.'):
    for file in files:
        if file.endswith('.db'):
            check_db(os.path.join(root, file))
