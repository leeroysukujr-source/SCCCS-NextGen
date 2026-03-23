import sqlite3
conn = sqlite3.connect('backend/instance/scccs.db')
tables_to_check = ['users', 'files', 'assignments', 'assignment_groups']
for table in tables_to_check:
    cursor = conn.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
    row = cursor.fetchone()
    if row:
        cursor = conn.execute(f"PRAGMA table_info({table})")
        columns = [r[1] for r in cursor.fetchall()]
        print(f"Table {table}: {len(columns)} columns")
        print(f"  {','.join(columns)}")
    else:
        print(f"Table {table} DOES NOT EXIST")
conn.close()
