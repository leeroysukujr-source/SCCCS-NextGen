import sqlite3
conn = sqlite3.connect('backend/instance/scccs.db')
cursor = conn.execute('PRAGMA table_info(files)')
for row in cursor.fetchall():
    print(row[1])
conn.close()
