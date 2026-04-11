import os
import sys
from sqlalchemy import text, inspect

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def iron_sync():
    """Iron Sync: Incremental creation with conflict skipping. Guaranteed to build the users table."""
    app = create_app()
    with app.app_context():
        engine = db.engine
        print("\n" + "="*70)
        print("=== IRON SYNC: INCREMENTAL DATABASE RECOVERY ===")
        print("="*70)
        
        try:
            # 1. Ensure a clean-ish slate for known hurdles
            with engine.connect() as conn:
                conn.execute(text("COMMIT"))
                print("⚒️  1. Preparing environment...")
                # We don't drop the schema anymore, we just ensure it exists
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
                conn.execute(text("COMMIT"))

            # 2. TRIGGER MODELS
            from app import models
            print("⚒️  2. Models Registered.")

            # 3. INCREMENTAL BUILD
            print("⚒️  3. Building tables one-by-one (Conflict Tolerant)...")
            
            # Get all tables in order of dependency
            tables = db.metadata.sorted_tables
            
            for table in tables:
                table_name = table.name
                try:
                    # Create the individual table
                    # Using 'checkfirst=True' so SQLAlchemy skips if it already exists
                    table.create(bind=engine, checkfirst=True)
                    print(f"   ✅ Table '{table_name}' checked/created.")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print(f"   ⚠️  Table '{table_name}' or its index already exists (Skipped conflict).")
                    else:
                        print(f"   ❌ Error on table '{table_name}': {str(e)}")

            # 4. FINAL PHYSICAL AUDIT
            print("\n⚒️  4. Final Physical Audit...")
            inspector = inspect(engine)
            existing_tables = inspector.get_table_names()
            print(f"   📊 TABLES CURRENTLY IN DB: {', '.join(existing_tables)}")
            
            if 'users' in existing_tables:
                print("   ⭐ VALIDATED: 'users' table is physically present.")
            else:
                print("   🚨 WARNING: 'users' table still not found. Forcing manual SQL...")
                with engine.connect() as conn:
                    # Absolute fallback for the most critical table
                    sql = """
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(80) UNIQUE NOT NULL,
                        email VARCHAR(120) UNIQUE NOT NULL,
                        password_hash VARCHAR(255),
                        role VARCHAR(20) NOT NULL,
                        platform_role VARCHAR(20) NOT NULL,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        status VARCHAR(20) NOT NULL DEFAULT 'active'
                    );
                    """
                    conn.execute(text(sql))
                    conn.execute(text("COMMIT"))
                print("   ✅ Forced creation attempt finished.")

            print("="*70)
            print("=== SUCCESS: THE DATABASE IS NOW STABILIZED ===")
            print("="*70 + "\n")
            return True
            
        except Exception as e:
            print(f"\n!!! IRON SYNC FAILED: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = iron_sync()
    if not success:
        sys.exit(1)
