import sqlite3
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Checking audit_logs schema...")
    with db.engine.connect() as conn:
        # Check if column exists
        try:
            result = conn.execute(text("PRAGMA table_info(audit_logs)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'workspace_id' not in columns:
                print("Adding workspace_id column to audit_logs...")
                try:
                    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN workspace_id INTEGER"))
                    print("Column added successfully.")
                    
                    # Create index if possible (SQLite syntax)
                    try:
                        conn.execute(text("CREATE INDEX ix_audit_logs_workspace_id ON audit_logs (workspace_id)"))
                        print("Index created.")
                    except Exception as e:
                        print(f"Index creation skipped: {e}")
                        
                    conn.commit()
                except Exception as e:
                    print(f"Failed to add column: {e}")
            else:
                print("Column workspace_id already exists.")
                
        except Exception as e:
            print(f"Error checking schema: {e}")
            # If table doesn't exist, create it (init_db usually does this but just in case)
            db.create_all()
            print("Tables created if missing.")

print("Migration check complete.")
