from app import create_app, db
from app.models import WorkspaceSetting
from sqlalchemy import text

app = create_app()

def migrate_phase7():
    print("🚀 Starting Phase 7 Migration: Workspace Settings Table...")
    with app.app_context():
        try:
             insp = db.inspect(db.engine)
             tables = insp.get_table_names()
             
             if 'workspace_settings' not in tables:
                 print("Creating table: workspace_settings")
                 WorkspaceSetting.__table__.create(db.engine)
             else:
                 print("Table 'workspace_settings' already exists.")
                 
             print("✅ Phase 7 Schema Migration Completed.")
             
        except Exception as e:
            print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate_phase7()
