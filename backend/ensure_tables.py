"""
ensure_tables.py — Run this BEFORE gunicorn to guarantee all tables exist in Neon.
Uses per-table creation with checkfirst=True so existing tables are never dropped.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db

def ensure_all_tables():
    app = create_app()
    with app.app_context():
        print("=== Ensuring all tables exist in Neon DB ===")
        
        # First try the fast path: create_all at once
        try:
            db.create_all()
            print("✅ db.create_all() succeeded.")
            return
        except Exception as e:
            print(f"⚠️  db.create_all() failed ({type(e).__name__}). Falling back to per-table creation...")
            try:
                db.session.rollback()
            except Exception:
                pass

        # Slow path: create each table individually in dependency order
        created = 0
        skipped = 0
        failed = []

        for table in db.metadata.sorted_tables:
            try:
                db.session.rollback()  # Start clean before each table
                table.create(db.engine, checkfirst=True)
                created += 1
            except Exception as te:
                error_msg = str(te)
                # DuplicateTable / already exists — safe to ignore
                if 'already exists' in error_msg or 'DuplicateTable' in error_msg:
                    skipped += 1
                else:
                    print(f"  ❌ Failed to create table '{table.name}': {error_msg[:120]}")
                    failed.append(table.name)
                try:
                    db.session.rollback()
                except Exception:
                    pass

        print(f"✅ Per-table creation complete: {created} created, {skipped} already existed, {len(failed)} failed")
        if failed:
            print(f"   Failed tables: {', '.join(failed)}")

if __name__ == '__main__':
    ensure_all_tables()
