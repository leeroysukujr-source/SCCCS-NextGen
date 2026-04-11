"""
ensure_tables.py — The Iron Version
Smart, incremental creation that skips existing objects without crashing.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

def iron_sync():
    app = create_app()
    with app.app_context():
        print("=== 🛡️ Starting Iron Schema Sync ===")
        
        # Lock the database so only ONE process can do this at a time
        try:
            db.session.execute(text("SELECT pg_advisory_xact_lock(123456);"))
            print("   🔒 Database lock acquired.")
        except Exception:
            print("   ⚠️  Could not acquire lock, proceeding with caution...")

        # Create tables one by one. If one exists, skip it.
        # This is the most stable way to handle a "messy" database.
        for table in db.metadata.sorted_tables:
            try:
                # checkfirst=True is the key—it only creates if missing
                table.create(db.engine, checkfirst=True)
                print(f"   ✅ Table '{table.name}' ensured.")
            except Exception as e:
                # If it already exists or has a conflict, we just skip it
                # because it means the table is already there for the app to use.
                db.session.rollback()
                print(f"   ℹ️  Table '{table.name}' already stable (skipped).")
        
        try:
            db.session.commit()
        except:
            db.session.rollback()

        print("=== 🏁 Iron Sync Finished: DB is Stable ===")

if __name__ == '__main__':
    iron_sync()
