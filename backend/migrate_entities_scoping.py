import sqlite3
import os

def migrate_core_entities():
    db_path = 'instance/scccs.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    tables_to_scope = ['classes', 'rooms', 'groups', 'channels', 'files']
    
    for table in tables_to_scope:
        print(f"Checking {table} table columns...")
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [column[1] for column in cursor.fetchall()]

        if 'workspace_id' not in columns:
            print(f"Adding 'workspace_id' column to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id)")
    
    conn.commit()

    # Backfill workspace_id from owners/creators
    print("Backfilling workspace_id for classes...")
    cursor.execute("""
        UPDATE classes 
        SET workspace_id = (SELECT workspace_id FROM users WHERE users.id = classes.teacher_id)
        WHERE workspace_id IS NULL
    """)

    print("Backfilling workspace_id for rooms...")
    cursor.execute("""
        UPDATE rooms 
        SET workspace_id = (SELECT workspace_id FROM users WHERE users.id = rooms.host_id)
        WHERE workspace_id IS NULL
    """)

    print("Backfilling workspace_id for groups...")
    cursor.execute("""
        UPDATE [groups] 
        SET workspace_id = (SELECT workspace_id FROM users WHERE users.id = [groups].created_by)
        WHERE workspace_id IS NULL
    """)

    print("Backfilling workspace_id for channels...")
    cursor.execute("""
        UPDATE channels 
        SET workspace_id = (SELECT workspace_id FROM users WHERE users.id = channels.created_by)
        WHERE workspace_id IS NULL
    """)

    print("Backfilling workspace_id for files...")
    cursor.execute("""
        UPDATE files 
        SET workspace_id = (SELECT workspace_id FROM users WHERE users.id = files.uploaded_by)
        WHERE workspace_id IS NULL
    """)

    conn.commit()
    print("✅ Core entities migration completed successfully!")
    conn.close()

if __name__ == '__main__':
    migrate_core_entities()
