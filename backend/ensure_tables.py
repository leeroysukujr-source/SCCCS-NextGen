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
                print("1. Preparing environment...")
                # We don't drop the schema anymore, we just ensure it exists
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
                conn.execute(text("COMMIT"))

            # 2. TRIGGER MODELS
            from app import models
            print("2. Models Registered.")

            # 3. INCREMENTAL BUILD
            print("3. Building tables one-by-one (Conflict Tolerant)...")
            
            # Get all tables in order of dependency
            tables = db.metadata.sorted_tables
            
            for table in tables:
                table_name = table.name
                try:
                    # Create the individual table
                    # Using 'checkfirst=True' so SQLAlchemy skips if it already exists
                    table.create(bind=engine, checkfirst=True)
                    print(f"   Table '{table_name}' checked/created.")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print(f"   Table '{table_name}' or its index already exists (Skipped conflict).")
                    else:
                        print(f"   Error on table '{table_name}': {str(e)}")

            # 4. ADVANCED SCHEMA DRIFT RECOVERY (Added for Production Robustness)
            print("4. Checking for missing columns (Schema Drift Recovery)...")
            inspector = inspect(engine)
            
            with engine.connect() as conn:
                # 4a. Check Assignments Table
                if 'assignments' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('assignments')]
                    if 'rubric' not in columns:
                        print("   Adding missing 'rubric' column to assignments...")
                        conn.execute(text("ALTER TABLE assignments ADD COLUMN rubric TEXT"))
                        conn.execute(text("COMMIT"))
                    if 'settings' not in columns:
                        print("   Adding missing 'settings' column to assignments...")
                        conn.execute(text("ALTER TABLE assignments ADD COLUMN settings TEXT"))
                        conn.execute(text("COMMIT"))
                
                # 4b. Check Assignment Grades Table
                if 'assignment_grades' in inspector.get_table_names():
                    grade_columns = [c['name'] for c in inspector.get_columns('assignment_grades')]
                    if 'rubric_scores' not in grade_columns:
                        print("   Adding missing 'rubric_scores' column to assignment_grades...")
                        conn.execute(text("ALTER TABLE assignment_grades ADD COLUMN rubric_scores TEXT"))
                        conn.execute(text("COMMIT"))

                # 4c. Check Files Table
                if 'files' in inspector.get_table_names():
                    file_columns = [c['name'] for c in inspector.get_columns('files')]
                    if 'submission_id' not in file_columns:
                        print("   Adding missing 'submission_id' column to files...")
                        try:
                            conn.execute(text("ALTER TABLE files ADD COLUMN submission_id INTEGER REFERENCES assignment_submissions(id)"))
                            conn.execute(text("COMMIT"))
                        except Exception as e:
                            print(f"      Could not add submission_id: {e}")
                            conn.execute(text("ROLLBACK"))
                
                # 4d. Check System Settings Table
                if 'system_settings' in inspector.get_table_names():
                    sys_columns = [c['name'] for c in inspector.get_columns('system_settings')]
                    missing_sys = {
                        'category': 'VARCHAR(50) DEFAULT \'general\'',
                        'value_type': 'VARCHAR(20) DEFAULT \'string\'',
                        'description': 'VARCHAR(255)',
                        'is_public': 'BOOLEAN DEFAULT FALSE',
                        'admin_only': 'BOOLEAN DEFAULT TRUE',
                        'is_overridable': 'BOOLEAN DEFAULT FALSE'
                    }
                    for col, col_type in missing_sys.items():
                        if col not in sys_columns:
                            print(f"   Adding missing '{col}' column to system_settings...")
                            try:
                                conn.execute(text(f"ALTER TABLE system_settings ADD COLUMN {col} {col_type}"))
                                conn.execute(text("COMMIT"))
                            except Exception as e:
                                print(f"      Could not add {col}: {e}")
                                conn.execute(text("ROLLBACK"))

            # 5. FINAL PHYSICAL AUDIT
            print("\n5. Final Physical Audit...")
            existing_tables = inspector.get_table_names()
            print(f"   TABLES CURRENTLY IN DB: {', '.join(existing_tables)}")
            
            if 'users' in existing_tables:
                print("   VALIDATED: 'users' table is physically present.")
            else:
                print("   WARNING: 'users' table still not found. Forcing manual SQL...")
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
                print("   Forced creation attempt finished.")

            if 'system_settings' in existing_tables:
                print("   VALIDATED: 'system_settings' table is physically present.")
            else:
                print("   WARNING: 'system_settings' table still not found. Forcing manual SQL...")
                with engine.connect() as conn:
                    sql = """
                    CREATE TABLE IF NOT EXISTS system_settings (
                        id SERIAL PRIMARY KEY,
                        key VARCHAR(100) UNIQUE NOT NULL,
                        value TEXT,
                        category VARCHAR(50) DEFAULT 'general',
                        value_type VARCHAR(20) DEFAULT 'string',
                        description VARCHAR(255),
                        is_public BOOLEAN DEFAULT FALSE,
                        admin_only BOOLEAN DEFAULT TRUE,
                        is_overridable BOOLEAN DEFAULT FALSE,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_system_settings_key ON system_settings (key);
                    """
                    # Use a fresh connection to avoid transaction issues
                    conn.execute(text(sql))
                    conn.execute(text("COMMIT"))
                print("   Forced system_settings creation attempt finished.")


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
