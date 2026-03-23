import sqlite3
import os

db_path = os.path.join('instance', 'scccs.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, column, type, default=None):
    try:
        sql = f"ALTER TABLE {table} ADD COLUMN {column} {type}"
        if default is not None:
            if isinstance(default, str):
                sql += f" DEFAULT '{default}'"
            else:
                sql += f" DEFAULT {default}"
        cursor.execute(sql)
        print(f"Added column {column} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print(f"Column {column} already exists in {table}")
        else:
            print(f"Error adding {column} to {table}: {e}")

# Add columns to rooms table
add_column('rooms', 'parent_id', 'INTEGER')
add_column('rooms', 'is_breakout', 'BOOLEAN', 0)
add_column('rooms', 'breakout_status', 'VARCHAR(20)', 'not_started')
add_column('rooms', 'breakout_config', 'TEXT')
add_column('rooms', 'is_locked', 'BOOLEAN', 0)

conn.commit()
conn.close()
print("Database fix completed.")
