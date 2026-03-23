import sqlite3
conn = sqlite3.connect('backend/instance/scccs.db')
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='assignments'")
row = cursor.fetchone()
if row:
    print("Table assignments EXISTS")
else:
    print("Table assignments DOES NOT EXIST")
conn.close()
