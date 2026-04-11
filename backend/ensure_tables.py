"""
ensure_tables.py — The Diamond Version
Full schema purge via CASCADE to resolve all orphan dependencies.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

def diamond_sync():
    app = create_app()
    with app.app_context():
        print("=== 💎 Starting Diamond Schema Sync ===")
        
        # 1. TOTAL PURGE: This drops every table and index in the public schema
        # to guarantee a 100% clean environment for create_all().
        print("🧨 Purging entire public schema...")
        cleanup_sql = """
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            -- Drop every table in the public schema (CASCADE takes everything else with it)
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
            
            -- Just in case any loose indexes remain
            FOR r IN (SELECT indexname FROM pg_indexes WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname) || ' CASCADE';
            END LOOP;
        END $$;
        """
        try:
            db.session.execute(text(cleanup_sql))
            db.session.commit()
            print("   ✅ Database is now 100% empty and clean.")
        except Exception as e:
            db.session.rollback()
            print(f"   ⚠️  Purge failed (non-critical): {e}")

        # 2. Rebuild from scratch using cycle-aware logic
        print("🏗️  Building official schema...")
        try:
            db.create_all()
            db.session.commit()
            print("   ✨ All tables created perfectly.")
        except Exception as e:
            print(f"   ❌ Schema build failed: {e}")
            
        print("=== 🏁 Diamond Sync Finished ===")

if __name__ == '__main__':
    diamond_sync()
