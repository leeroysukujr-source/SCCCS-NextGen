"""
ensure_tables.py — Ultra-Robust Schema Synchronizer
Handles "orphan indexes" in Neon DB by dropping them if they block table creation.
"""
import sys
import os
import re
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

def ensure_all_tables():
    app = create_app()
    with app.app_context():
        print("=== 🛠️  Starting Ultra-Robust Schema Sync ===")

        # Identify all tables
        tables = list(db.metadata.sorted_tables)
        
        # We loop up to 5 times to ensure dependencies are met in multiple passes
        for pass_num in range(1, 6):
            print(f"\n--- 🔄 Schema Sync Pass {pass_num}/5 ---")
            created_in_pass = 0
            remaining_tables = []
            
            for table in tables:
                try:
                    with db.engine.connect() as conn:
                        if db.engine.dialect.has_table(conn, table.name):
                            continue # Already exists
                        
                        # Use a retry loop for orphan indexes
                        for attempt in range(2):
                            try:
                                with conn.begin():
                                    table.create(conn, checkfirst=False)
                                    print(f"   ✨ Created {table.name}.")
                                    created_in_pass += 1
                                    break
                            except Exception as te:
                                err_msg = str(te)
                                if "already exists" in err_msg and attempt == 0:
                                    match = re.search(r'relation "([^"]+)" already exists', err_msg) or \
                                            re.search(r'index "([^"]+)" already exists', err_msg)
                                    if match:
                                        offending = match.group(1)
                                        print(f"   ⚠️  Dropping orphan index {offending} for {table.name}...")
                                        with db.engine.connect() as drop_conn:
                                            with drop_conn.begin():
                                                drop_conn.execute(text(f'DROP INDEX IF EXISTS "{offending}" CASCADE'))
                                        continue # Retry creation
                                raise te # If not an index issue or second attempt, fail pass
                except Exception as pass_e:
                    remaining_tables.append(table)
            
            tables = remaining_tables
            if not tables:
                print("✅ All tables verified/created successfully.")
                break
            if created_in_pass == 0:
                print(f"⚠️  No progress made in pass {pass_num}. {len(remaining_tables)} tables still missing.")
                break

        if tables:
            print(f"❌ Final missing tables: {[t.name for t in tables]}")

if __name__ == '__main__':
    ensure_all_tables()
