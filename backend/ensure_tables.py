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

        # Identify all tables in dependency order
        tables = db.metadata.sorted_tables
        
        created = 0
        skipped = 0
        failed = []

        for table in tables:
            print(f"⌛ Processing {table.name}...")
            
            # Use a fresh connection and transaction for every attempt
            attempt_count = 0
            while attempt_count < 3: # Allow up to 2 retries for index issues
                attempt_count += 1
                try:
                    with db.engine.connect() as conn:
                        # Check if table exists
                        if db.engine.dialect.has_table(conn, table.name):
                            print(f"   ✅ {table.name} already exists.")
                            skipped += 1
                            break
                        
                        # Try to create table
                        with conn.begin():
                            table.create(conn, checkfirst=False)
                            print(f"   ✨ Created {table.name}.")
                            created += 1
                            break
                            
                except Exception as e:
                    err_msg = str(e)
                    
                    # Check for "already exists" errors (Relation / Index / Constraint)
                    if "already exists" in err_msg:
                        # Parse out the name of the offending index/constraint
                        # Example: 'relation "ix_users_username" already exists'
                        match = re.search(r'relation "([^"]+)" already exists', err_msg)
                        if not match:
                             match = re.search(r'index "([^"]+)" already exists', err_msg)
                        
                        if match:
                            offending_object = match.group(1)
                            print(f"   ⚠️  Found orphan object: {offending_object}. Dropping and retrying...")
                            try:
                                with db.engine.connect() as conn:
                                    with conn.begin():
                                        conn.execute(text(f'DROP INDEX IF EXISTS "{offending_object}" CASCADE'))
                                        conn.execute(text(f'DROP CONSTRAINT IF EXISTS "{offending_object}" CASCADE'))
                                continue # Retry table creation
                            except Exception as drop_err:
                                print(f"   ❌ Could not drop {offending_object}: {drop_err}")
                                break
                        else:
                            print(f"   ⚠️  Object already exists but couldn't parse name. Skipping.")
                            skipped += 1
                            break
                    else:
                        print(f"   ❌ Failed to create {table.name}: {err_msg[:200]}")
                        failed.append(table.name)
                        break

        print("\n" + "="*40)
        print(f"✅ Sync Complete: {created} Created, {skipped} Skipped, {len(failed)} Failed")
        if failed:
            print(f"⚠️  Missing: {', '.join(failed)}")
        print("="*40)

if __name__ == '__main__':
    ensure_all_tables()
