import sqlite3
import os

db_path = os.path.join("backend", "instance", "scccs.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM system_settings WHERE value LIKE '%supabase.co%';")
    rows = cursor.fetchall()
    for row in rows:
        print(f"{row[0]}: {row[1]}")
    
    cursor.execute("SELECT logo_url FROM workspaces WHERE logo_url LIKE '%supabase.co%';")
    rows = cursor.fetchall()
    for row in rows:
        print(f"WS Logo: {row[0]}")
    conn.close()
