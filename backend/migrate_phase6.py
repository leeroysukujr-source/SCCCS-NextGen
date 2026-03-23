from app import create_app, db
from app.models import Permission, Role, role_permissions, user_roles
from sqlalchemy import text

app = create_app()

def migrate_phase6():
    print("🚀 Starting Phase 6 Migration: RBAC Tables...")
    with app.app_context():
        # Create tables
        try:
             # Using simplified approach since we don't have standard alembic hooked up for this CLI
             # We rely on db.create_all() but that might only work for new tables if models are imported
             
             # Check if tables exist
             insp = db.inspect(db.engine)
             tables = insp.get_table_names()
             
             if 'permissions' not in tables:
                 print("Creating table: permissions")
                 Permission.__table__.create(db.engine)
             else:
                 print("Table 'permissions' already exists.")
                 
             if 'roles' not in tables:
                 print("Creating table: roles")
                 Role.__table__.create(db.engine)
             else:
                 print("Table 'roles' already exists.")
             
             if 'role_permissions' not in tables:
                 print("Creating table: role_permissions")
                 role_permissions.create(db.engine)
             else:
                 print("Table 'role_permissions' already exists.")
                 
             if 'user_roles' not in tables:
                 print("Creating table: user_roles")
                 user_roles.create(db.engine)
             else:
                 print("Table 'user_roles' already exists.")
                 
             print("✅ Phase 6 Schema Migration Completed.")
             
        except Exception as e:
            print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate_phase6()
