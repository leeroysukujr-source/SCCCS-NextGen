import sqlite3
import os
import json

db_path = os.path.join('instance', 'scccs.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

result = {}
for tab in ['global_feature_flags', 'workspace_feature_overrides', 'workspaces']:
    try:
        cursor.execute(f"PRAGMA table_info({tab})")
        result[tab] = cursor.fetchall()
    except Exception as e:
        result[tab] = str(e)

with open('full_schema.json', 'w') as f:
    json.dump(result, f, indent=2)

conn.close()
print("Schema dumped to full_schema.json")
