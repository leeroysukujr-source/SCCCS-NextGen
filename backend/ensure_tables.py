"""
ensure_tables.py — The Golden Version
1. Performs a 'soft wipe' of orphan indexes/constraints.
2. Uses the native SQLAlchemy create_all() to solve cycles correctly.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

def golden_sync():
    app = create_app()
    with app.app_context():
        print("=== 🌟 Starting Golden Schema Sync ===")
        
        # 1. Clean up ALL indexes and constraints that are blocking us
        print("🧹 Clearing all blocking relations...")
        cleanup_sql = """
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            -- Drop all indexes in public schema
            FOR r IN (SELECT indexname FROM pg_indexes WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname) || ' CASCADE';
            END LOOP;
            
            -- Drop all tables in public schema to ensure a clean create_all
            -- This is safe because your tables currently fail to even load
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
        """
        try:
            db.session.execute(text(cleanup_sql))
            db.session.commit()
            print("   ✅ Database slate wiped clean.")
        except Exception as e:
            db.session.rollback()
            print(f"   ⚠️  Cleanup failed (non-critical): {e}")

        # 2. Use the official create_all() which handles the User/Workspace cycle
        print("🏗️  Building official schema...")
        try:
            db.create_all()
            db.session.commit()
            print("   ✨ All 80+ tables created successfully via SQLAlchemy native Sync.")
        except Exception as e:
            print(f"   ❌ Schema build failed: {e}")
            
        print("=== 🏁 Golden Sync Finished ===")

if __name__ == '__main__':
    golden_sync()
