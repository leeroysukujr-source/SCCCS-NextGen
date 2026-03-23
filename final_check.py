import sqlite3
conn = sqlite3.connect('backend/instance/scccs.db')
cursor = conn.execute("PRAGMA table_info(files)")
columns = [r[1] for r in cursor.fetchall()]
if 'assignment_id' in columns:
    print("assignment_id FOUND in files")
else:
    print("assignment_id MISSING in files")
    print(f"Current columns: {columns}")
conn.close()
