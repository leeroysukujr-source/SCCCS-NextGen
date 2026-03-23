"""
Simple script to add call-related columns to direct_messages table.
This uses raw SQL to add the columns if they don't exist.
"""
import sqlite3
import os
from pathlib import Path

def add_columns():
    """Add call-related columns to direct_messages table"""
    # Find the database file
    # Check common locations
    db_paths = [
        'instance/database.db',
        'database.db',
        'app/instance/database.db',
        os.path.join(os.path.dirname(__file__), 'instance', 'database.db')
    ]
    
    db_path = None
    for path in db_paths:
        full_path = Path(__file__).parent / path
        if full_path.exists():
            db_path = str(full_path)
            break
    
    if not db_path:
        print("❌ Could not find database file. Searching in common locations...")
        # Search for .db files
        for root, dirs, files in os.walk(os.path.dirname(__file__)):
            for file in files:
                if file.endswith('.db'):
                    db_path = os.path.join(root, file)
                    print(f"Found database: {db_path}")
                    break
            if db_path:
                break
    
    if not db_path:
        print("❌ Database file not found. Please specify the database path.")
        return
    
    print(f"Using database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(direct_messages)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Existing columns: {columns}")
        
        # Add call_room_id if it doesn't exist
        if 'call_room_id' not in columns:
            print("Adding call_room_id column...")
            cursor.execute("ALTER TABLE direct_messages ADD COLUMN call_room_id INTEGER")
            print("✅ Added call_room_id")
        else:
            print("call_room_id already exists")
        
        # Add call_duration if it doesn't exist
        if 'call_duration' not in columns:
            print("Adding call_duration column...")
            cursor.execute("ALTER TABLE direct_messages ADD COLUMN call_duration INTEGER")
            print("✅ Added call_duration")
        else:
            print("call_duration already exists")
        
        # Add call_status if it doesn't exist
        if 'call_status' not in columns:
            print("Adding call_status column...")
            cursor.execute("ALTER TABLE direct_messages ADD COLUMN call_status VARCHAR(20)")
            print("✅ Added call_status")
        else:
            print("call_status already exists")
        
        conn.commit()
        conn.close()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    add_columns()

