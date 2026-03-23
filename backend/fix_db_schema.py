import sqlite3
import os

db_path = os.path.join('instance', 'scccs.db')
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, column, type_def):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}")
        print(f"✅ Added column {column} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"ℹ️ Column {column} already exists in {table}")
        else:
            print(f"❌ Error adding {column} to {table}: {e}")

print("Applying schema fixes...")
# Phase 1: platform_role
add_column('users', 'platform_role', "VARCHAR(20) NOT NULL DEFAULT 'NONE'")

# Phase 5: is_public, is_overridable in system_settings
add_column('system_settings', 'is_public', "BOOLEAN DEFAULT 0")
add_column('system_settings', 'is_overridable', "BOOLEAN DEFAULT 0")

conn.commit()
conn.close()
print("Schema updates complete.")
