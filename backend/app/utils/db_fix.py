import sqlite3
import os
from flask import current_app

def fix_room_schema():
    """Ensure rooms table has modern breakout and locking columns."""
    try:
        # Get database path from config
        db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
        if not db_uri.startswith('sqlite:///'):
            return # Only fix sqlite for now
            
        db_path = db_uri.replace('sqlite:///', '')
        # Handle relative pathing if instance folder used
        if 'instance' in db_path and not os.path.isabs(db_path):
             # Try standard relative to current app.root_path or CWD
             pass

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(rooms);")
        existing_cols = [col[1] for col in cursor.fetchall()]
        
        required_cols = [
            ('parent_id', 'INTEGER'),
            ('is_breakout', 'BOOLEAN DEFAULT 0'),
            ('breakout_status', "VARCHAR(20) DEFAULT 'not_started'"),
            ('breakout_config', 'TEXT'),
            ('is_locked', 'BOOLEAN DEFAULT 0')
        ]
        
        needed = False
        for col_name, col_type in required_cols:
            if col_name not in existing_cols:
                try:
                    cursor.execute(f"ALTER TABLE rooms ADD COLUMN {col_name} {col_type};")
                    print(f"[DB FIX] Added missing column {col_name} to rooms table")
                    needed = True
                except Exception as e:
                    print(f"[DB FIX] Error adding {col_name}: {e}")
        
        if needed:
            conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB FIX] Critical error during schema sync: {e}")
