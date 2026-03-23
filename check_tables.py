import sqlite3
conn = sqlite3.connect('backend/instance/scccs.db')
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print(",".join(tables))
conn.close()
