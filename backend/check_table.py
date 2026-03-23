import sqlite3
import os

db_path = 'instance/scccs.db'
if not os.path.exists(db_path):
    db_path = 'scccs.db'

conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("PRAGMA table_info(assignment_groups)")
cols = c.fetchall()
print("Columns:")
for col in cols:
    print(col)
conn.close()
