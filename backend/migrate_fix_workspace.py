import sqlite3
import os

db_path = 'instance/scccs.db'
if not os.path.exists(db_path):
    db_path = 'scccs.db'

print(f"Connecting to {db_path}")
conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute('ALTER TABLE channels ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id)')
    print("Added workspace_id to channels")
except Exception as e:
    print(f"Skipping workspace_id: {e}")

try:
    c.execute('ALTER TABLE assignment_groups ADD COLUMN assignment_id INTEGER REFERENCES assignments(id)')
    # Just in case assignment_id missing? Unlikely.
except: pass

conn.commit()
conn.close()
