"""
ensure_tables.py — The Super-Diamond Version
Total database purge and official SQLAlchemy rebuild.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

def super_diamond_sync():
    app = create_app()
    with app.app_context():
        print("=== 💎 Starting Super-Diamond Schema Sync ===")
        
        # 1. TOTAL PURGE: Drop everything owned by the user.
        # This is the cleanest way to reset a Postgres database.
        print("🧨 Purging all database objects owned by current user...")
        cleanup_sql = "DROP OWNED BY CURRENT_USER CASCADE;"
        try:
            db.session.execute(text(cleanup_sql))
            db.session.commit()
            print("   ✅ Database cleared completely.")
        except Exception as e:
            db.session.rollback()
            print(f"   ⚠️  Purge failed (retrying with schema wipe): {e}")
            try:
                db.session.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"))
                db.session.commit()
                print("   ✅ Public schema recreated.")
            except Exception as e2:
                db.session.rollback()
                print(f"   ❌ Critical: Could not reset database: {e2}")

        # 2. Rebuild using SQLAlchemy native create_all()
        # This correctly handles the User/Workspace circular dependencies.
        print("🏗️  Building official schema...")
        try:
            db.create_all()
            db.session.commit()
            print("   ✨ All 80+ tables created successfully.")
        except Exception as e:
            print(f"   ❌ Schema build failed: {e}")
            
        print("=== 🏁 Super-Diamond Sync Finished ===")

if __name__ == '__main__':
    super_diamond_sync()
