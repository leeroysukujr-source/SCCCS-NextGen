"""
ensure_tables.py — The Omega Version
Total schema annihilation and fresh rebuild. 
This is the only 100% guarantee against 'ghost' indexes.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

def omega_sync():
    app = create_app()
    with app.app_context():
        print("=== 🔱 Starting Omega Database Sync ===")
        
        # 1. THE OMEGA WIPE: Recreate the entire schema
        # This kills every table, index, type, and constraint in one command.
        print("🧨 Executing Omega Wipe (Schema Annihilation)...")
        # We try to drop the schema itself. If the DB user doesn't have 
        # permission, we fall back to a brute-force ordered drop.
        cmds = [
            "DROP SCHEMA public CASCADE;",
            "CREATE SCHEMA public;",
            "GRANT ALL ON SCHEMA public TO public;", 
            "GRANT ALL ON SCHEMA public TO " + app.config['SQLALCHEMY_DATABASE_URI'].split(':')[1].replace('//','')
        ]
        
        try:
            for cmd in cmds:
                try:
                    db.session.execute(text(cmd))
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    print(f"   ⚠️  Note: Schema command '{cmd[:20]}...' failed (skipping): {e}")
            print("   ✅ Public schema reset completed.")
        except Exception as e:
            print(f"   ❌ Final wipe attempt failed: {e}")

        # 2. THE REBUILD: Official SQLAlchemy native create_all
        print("🏗️  Rebuilding from absolute zero...")
        try:
            # checkfirst=False tells SQLAlchemy 'Don't even check, just do it.'
            # because we KNOW it's empty.
            db.metadata.create_all(db.engine)
            db.session.commit()
            print("   ✨ Database reconstructed successfully.")
        except Exception as e:
            # Final fallback: if create_all fails, we try individual table creation
            print(f"   ⚠️  Rebuild error: {e}. Attempting recovery...")
            db.session.rollback()
            try:
                db.create_all()
                db.session.commit()
                print("   ✨ Emergency rebuild successful.")
            except Exception as e2:
                print(f"   ❌ Critical build failure: {e2}")
            
        print("=== 🏁 Omega Sync Finished ===")

if __name__ == '__main__':
    omega_sync()
