import sqlite3
import os

db_path = 'instance/scccs.db'
if not os.path.exists(db_path):
    db_path = 'scccs.db'

conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute("ALTER TABLE channels ADD COLUMN status VARCHAR(20) DEFAULT 'draft'")
    print("Added status to channels")
except Exception as e:
    print(f"Skipping status (maybe exists): {e}")

# Update existing relevant channels to published? 
# Maybe update old channels to 'published' so they don't disappear?
# Or 'draft'.
# I'll default existing course channels to 'draft' (safe) or 'published'?
# User said "only available when lecturer click publish".
# If I set draft, all current courses disappear from students (if they saw them).
# I'll set 'draft' as default.
# But for testing, I'll update all 'course' type channels to 'draft' except maybe one manually?
# I'll just leave them null (which behaves like draft if I check == published).
# Wait, column default is 'draft'. Existing rows get 'draft'.

conn.commit()
conn.close()
