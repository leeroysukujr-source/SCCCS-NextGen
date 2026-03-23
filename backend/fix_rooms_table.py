"""
Script to fix the rooms table schema by adding missing columns
"""
from app import create_app, db
from config import Config
import sqlite3
import os

def fix_rooms_table():
    app = create_app(Config)
    
    with app.app_context():
        # Get the database path
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
            
            if not os.path.exists(db_path):
                print(f"Database file {db_path} does not exist. Creating tables...")
                db.create_all()
                print("✓ All tables created")
                return
            
            # Connect to SQLite database
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            try:
                # Check if rooms table exists
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'")
                table_exists = cursor.fetchone() is not None
                
                if not table_exists:
                    print("Rooms table does not exist. Creating all tables...")
                    conn.close()
                    db.create_all()
                    print("✓ All tables created")
                    return
                
                # Check existing columns
                cursor.execute("PRAGMA table_info(rooms)")
                columns = {row[1]: row for row in cursor.fetchall()}
                print(f"Current columns: {list(columns.keys())}")
                
                # Add started_at if it doesn't exist
                if 'started_at' not in columns:
                    print("Adding 'started_at' column to rooms table...")
                    cursor.execute("ALTER TABLE rooms ADD COLUMN started_at DATETIME")
                    print("✓ Added 'started_at' column")
                else:
                    print("✓ 'started_at' column already exists")
                
                # Add ended_at if it doesn't exist
                if 'ended_at' not in columns:
                    print("Adding 'ended_at' column to rooms table...")
                    cursor.execute("ALTER TABLE rooms ADD COLUMN ended_at DATETIME")
                    print("✓ Added 'ended_at' column")
                else:
                    print("✓ 'ended_at' column already exists")
                
                conn.commit()
                print("\n✓ Database schema updated successfully!")
                
                # Verify
                cursor.execute("PRAGMA table_info(rooms)")
                final_columns = [row[1] for row in cursor.fetchall()]
                print(f"Final columns: {final_columns}")
                
            except Exception as e:
                print(f"Error: {e}")
                import traceback
                traceback.print_exc()
                conn.rollback()
            finally:
                conn.close()
        else:
            print("This script only works with SQLite databases")
            print("For other databases, use Flask-Migrate to create a migration")

if __name__ == '__main__':
    fix_rooms_table()

