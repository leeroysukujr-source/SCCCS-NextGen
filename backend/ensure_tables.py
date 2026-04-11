"""
ensure_tables.py — Run this BEFORE gunicorn to guarantee all tables exist in Neon.
Uses a fresh DB connection per table so aborted transactions never block creation.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

def ensure_all_tables():
    app = create_app()
    with app.app_context():
        print("=== Ensuring all tables exist in Neon DB ===")

        # Fast path: try create_all first
        try:
            db.create_all()
            print("✅ db.create_all() succeeded — all tables ready.")
            return
        except Exception as e:
            print(f"⚠️  db.create_all() failed: {type(e).__name__}: {str(e)[:120]}")
            print("    Falling back to per-table creation with fresh connections...")

        # Slow path: fresh connection per table to avoid aborted transaction contamination
        created = 0
        skipped = 0
        failed = []

        for table in db.metadata.sorted_tables:
            # Each table gets its own isolated connection — no shared transaction state
            try:
                with db.engine.connect() as conn:
                    with conn.begin():
                        if not db.engine.dialect.has_table(conn, table.name):
                            table.create(conn, checkfirst=False)
                            print(f"  ✅ Created table: {table.name}")
                            created += 1
                        else:
                            skipped += 1
            except Exception as te:
                error_msg = str(te)
                if 'already exists' in error_msg or 'DuplicateTable' in error_msg:
                    skipped += 1
                else:
                    print(f"  ❌ Failed '{table.name}': {error_msg[:150]}")
                    failed.append(table.name)

        print(f"\n✅ Schema complete: {created} created, {skipped} already existed, {len(failed)} failed")
        if failed:
            print(f"   ⚠️  Failed tables (likely FK deps): {', '.join(failed)}")
            print("   These will be created on next deploy once their parent tables exist.")

if __name__ == '__main__':
    ensure_all_tables()

