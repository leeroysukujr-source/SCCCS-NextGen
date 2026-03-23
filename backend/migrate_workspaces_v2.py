import sqlite3
import os
from datetime import datetime

def migrate():
    db_path = 'instance/scccs.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Checking workspaces table columns...")
    cursor.execute("PRAGMA table_info(workspaces)")
    columns = [column[1] for column in cursor.fetchall()]

    # Add 'code' column
    if 'code' not in columns:
        print("Adding 'code' column to workspaces...")
        cursor.execute("ALTER TABLE workspaces ADD COLUMN code VARCHAR(50)")
    
    # Add 'status' column
    if 'status' not in columns:
        print("Adding 'status' column to workspaces...")
        cursor.execute("ALTER TABLE workspaces ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL")

    # Commit structural changes
    conn.commit()

    # Initialize 'code' for existing workspaces if NULL (using slug as default)
    print("Initializing 'code' for existing workspaces...")
    cursor.execute("UPDATE workspaces SET code = slug WHERE code IS NULL")

    # Create Legacy Workspace if it doesn't exist
    print("Ensuring Legacy Workspace exists...")
    cursor.execute("SELECT id FROM workspaces WHERE code = 'LEGACY'")
    legacy_ws = cursor.fetchone()
    
    if not legacy_ws:
        print("Creating Legacy Workspace...")
        cursor.execute(
            "INSERT INTO workspaces (name, slug, code, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            ("Legacy Workspace", "legacy", "LEGACY", "Auto-created workspace for existing users", "active", datetime.utcnow().isoformat())
        )
        legacy_ws_id = cursor.lastrowid
    else:
        legacy_ws_id = legacy_ws[0]
    
    print(f"Legacy Workspace ID: {legacy_ws_id}")

    # Assign all non-superadmin users to Legacy Workspace
    print("Assigning non-superadmin users to Legacy Workspace...")
    cursor.execute(
        "UPDATE users SET workspace_id = ? WHERE role != 'super_admin' AND (workspace_id IS NULL OR workspace_id = '')",
        (legacy_ws_id,)
    )

    conn.commit()
    print("✅ Migration completed successfully!")
    conn.close()

if __name__ == '__main__':
    migrate()
