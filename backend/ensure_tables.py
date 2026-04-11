"""
ensure_tables.py — The Titan Version
A guaranteed, forced reset and rebuild.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

def titan_sync():
    app = create_app()
    with app.app_context():
        print("=== 🏗️ Starting Titan Database Sync ===")
        
        # 1. THE TITAN WIPE: Forced ordered cleanup.
        # We drop TABLES first (with CASCADE), which naturally kills all indexes/constraints.
        print("🧨 Executing Titan Wipe (Forced Order)...")
        cleanup_sql = """
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            -- 1. Drop all tables with CASCADE (this kills almost everything)
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
            
            -- 2. Clean up any remaining loose indexes (like orphan search indexes)
            FOR r IN (SELECT indexname FROM pg_indexes WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname) || ' CASCADE';
            END LOOP;
            
            -- 3. Clean up any custom types (if any exist)
            FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
                EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
            END LOOP;
        END $$;
        """
        try:
            db.session.execute(text(cleanup_sql))
            db.session.commit()
            print("   ✅ Database wiped to absolute zero.")
        except Exception as e:
            db.session.rollback()
            print(f"   ⚠️  Wipe had issues: {e}")

        # 2. THE TITAN REBUILD: Pure, original SQLAlchemy build.
        print("🏗️  Rebuilding Titan Schema...")
        try:
            # We use db.create_all() directly here. 
            # It is the only way to solve the User/Workspace cycle correctly.
            db.create_all()
            db.session.commit()
            print("   ✨ 100% of tables and relations created successfully.")
        except Exception as e:
            print(f"   ❌ Titan build failed: {e}")
            
        print("=== 🏁 Titan Sync Finished ===")

if __name__ == '__main__':
    titan_sync()
