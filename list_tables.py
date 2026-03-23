import sqlite3
import os

db_path = os.path.join("backend", "scccs.db")
if not os.path.exists(db_path):
    print(f"Error: DB not found at {db_path}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables in scccs.db:")
        for t in tables:
            print(f" - {t[0]}")
        conn.close()
    except Exception as e:
        print(f"Error listing tables: {e}")

db_path_2 = os.path.join("backend", "app.db")
if os.path.exists(db_path_2):
    try:
        conn = sqlite3.connect(db_path_2)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("\nTables in app.db:")
        for t in tables:
            print(f" - {t[0]}")
        conn.close()
    except Exception as e:
        print(f"Error listing tables in app.db: {e}")
