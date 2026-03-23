"""
Script to check and fix the database schema
"""
from app import create_app, db
from app.models import Room
from config import Config
import sqlite3
import os

def check_and_fix():
    app = create_app(Config)
    
    with app.app_context():
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        db_path = db_uri.replace('sqlite:///', '')
        
        print(f"DB URI: {db_uri}")
        print(f"DB Path: {db_path}")
        print(f"Absolute path: {os.path.abspath(db_path)}")
        print(f"File exists: {os.path.exists(db_path)}")
        
        if os.path.exists(db_path):
            print(f"File size: {os.path.getsize(db_path)} bytes")
        
        # Connect and check
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        print(f"\nAll tables: {tables}")
        
        if 'rooms' in tables:
            cursor.execute('PRAGMA table_info(rooms)')
            cols = [r[1] for r in cursor.fetchall()]
            print(f"\nRooms table columns: {cols}")
            print(f"Has started_at: {'started_at' in cols}")
            print(f"Has ended_at: {'ended_at' in cols}")
            
            if 'started_at' not in cols or 'ended_at' not in cols:
                print("\n⚠️  Table is missing columns. Dropping and recreating...")
                conn.close()
                
                # Drop and recreate
                db.drop_all()
                db.create_all()
                
                # Verify
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute('PRAGMA table_info(rooms)')
                new_cols = [r[1] for r in cursor.fetchall()]
                print(f"✓ New columns: {new_cols}")
                conn.close()
        else:
            print("\n⚠️  Rooms table doesn't exist. Creating all tables...")
            conn.close()
            db.create_all()
            
            # Verify
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute('PRAGMA table_info(rooms)')
            new_cols = [r[1] for r in cursor.fetchall()]
            print(f"✓ Created rooms table with columns: {new_cols}")
            conn.close()
        
        # Final check - verify model matches
        print(f"\nModel columns: {[c.name for c in Room.__table__.columns]}")

if __name__ == '__main__':
    check_and_fix()

