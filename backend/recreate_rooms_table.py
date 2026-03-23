"""
Script to drop and recreate the rooms table with correct schema
"""
from app import create_app, db
from config import Config
import sqlite3
import os

def recreate_rooms_table():
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
                
                if table_exists:
                    print("Dropping existing rooms table...")
                    # Check if there are foreign key constraints
                    cursor.execute("PRAGMA foreign_keys")
                    fk_enabled = cursor.fetchone()[0]
                    
                    if not fk_enabled:
                        cursor.execute("PRAGMA foreign_keys=OFF")
                    
                    # Drop the table
                    cursor.execute("DROP TABLE IF EXISTS rooms")
                    print("✓ Dropped rooms table")
                    
                    if not fk_enabled:
                        cursor.execute("PRAGMA foreign_keys=ON")
                
                conn.commit()
                conn.close()
                
                # Now recreate all tables using SQLAlchemy
                print("Recreating all tables with correct schema...")
                db.create_all()
                print("✓ All tables recreated")
                
                # Verify
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("PRAGMA table_info(rooms)")
                columns = [row[1] for row in cursor.fetchall()]
                print(f"✓ Rooms table columns: {columns}")
                print(f"✓ Has started_at: {'started_at' in columns}")
                print(f"✓ Has ended_at: {'ended_at' in columns}")
                conn.close()
                
            except Exception as e:
                print(f"Error: {e}")
                import traceback
                traceback.print_exc()
                conn.rollback()
                conn.close()

if __name__ == '__main__':
    recreate_rooms_table()

