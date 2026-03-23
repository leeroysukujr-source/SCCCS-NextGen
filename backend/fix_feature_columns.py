import sqlite3
import os

db_path = os.path.join('instance', 'scccs.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Updating global_feature_flags...")
try:
    cursor.execute("ALTER TABLE global_feature_flags ADD COLUMN config TEXT")
    print("Added config column to global_feature_flags")
except Exception as e:
    print(f"Error updating global_feature_flags: {e}")

print("Updating workspace_feature_overrides...")
try:
    cursor.execute("ALTER TABLE workspace_feature_overrides ADD COLUMN config TEXT")
    print("Added config column to workspace_feature_overrides")
except Exception as e:
    print(f"Error updating workspace_feature_overrides: {e}")

conn.commit()
conn.close()
print("Migration finished.")
