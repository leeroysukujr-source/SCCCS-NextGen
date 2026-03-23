"""
Migration script to add advanced chat features columns to existing tables
Run this script once to update your database schema
"""
import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add new columns for advanced chat features"""
    # Find the database file - check both possible names
    instance_dir = Path(__file__).parent / 'instance'
    db_path = None
    
    # Check for scccs.db first (the actual database name)
    scccs_db = instance_dir / 'scccs.db'
    database_db = instance_dir / 'database.db'
    
    if scccs_db.exists():
        db_path = scccs_db
        print(f"Found database at: {db_path}")
    elif database_db.exists():
        db_path = database_db
        print(f"Found database at: {db_path}")
    else:
        print(f"Database not found in {instance_dir}")
        print("Looking for: scccs.db or database.db")
        print("Database will be created by Flask on first run")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    print("Starting migration...")
    
    try:
        # Add new columns to messages table
        print("Adding columns to messages table...")
        messages_columns = [
            ('reply_to_id', 'INTEGER REFERENCES messages(id)'),
            ('is_edited', 'BOOLEAN DEFAULT 0'),
            ('is_pinned', 'BOOLEAN DEFAULT 0'),
            ('is_forwarded', 'BOOLEAN DEFAULT 0'),
            ('original_message_id', 'INTEGER REFERENCES messages(id)'),
            ('forward_count', 'INTEGER DEFAULT 0'),
            ('reaction_count', 'INTEGER DEFAULT 0'),
            ('reply_count', 'INTEGER DEFAULT 0'),
            ('view_count', 'INTEGER DEFAULT 0'),
            ('expires_at', 'DATETIME'),
        ]
        
        for column_name, column_type in messages_columns:
            try:
                cursor.execute(f"ALTER TABLE messages ADD COLUMN {column_name} {column_type}")
                print(f"  ✓ Added {column_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"  - Column {column_name} already exists")
                else:
                    print(f"  ✗ Error adding {column_name}: {e}")
        
        # Add new columns to channels table
        print("\nAdding columns to channels table...")
        channels_columns = [
            ('avatar_url', 'VARCHAR(500)'),
            ('updated_at', 'DATETIME'),
            ('max_members', 'INTEGER'),
            ('allow_file_sharing', 'BOOLEAN DEFAULT 1'),
            ('allow_message_editing', 'BOOLEAN DEFAULT 1'),
            ('allow_message_deletion', 'BOOLEAN DEFAULT 1'),
            ('default_message_ttl', 'INTEGER'),
        ]
        
        for column_name, column_type in channels_columns:
            try:
                cursor.execute(f"ALTER TABLE channels ADD COLUMN {column_name} {column_type}")
                print(f"  ✓ Added {column_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"  - Column {column_name} already exists")
                else:
                    print(f"  ✗ Error adding {column_name}: {e}")
        
        # Add new columns to channel_members table
        print("\nAdding columns to channel_members table...")
        members_columns = [
            ('last_read_at', 'DATETIME'),
            ('is_muted', 'BOOLEAN DEFAULT 0'),
            ('notification_settings', 'TEXT'),
        ]
        
        for column_name, column_type in members_columns:
            try:
                cursor.execute(f"ALTER TABLE channel_members ADD COLUMN {column_name} {column_type}")
                print(f"  ✓ Added {column_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"  - Column {column_name} already exists")
                else:
                    print(f"  ✗ Error adding {column_name}: {e}")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()

