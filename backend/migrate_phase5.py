from app import create_app, db
from app.models import WorkspaceDomain

app = create_app()

def migrate():
    with app.app_context():
        print("Migrating Phase 5: Creating workspace_domains table...")
        try:
            # Create the table
            WorkspaceDomain.__table__.create(db.engine)
            print("✅ Successfully created 'workspace_domains' table.")
        except Exception as e:
            if "already exists" in str(e):
                 print("⚠️  Table 'workspace_domains' already exists. Skipping.")
            else:
                 print(f"❌ Error creating table: {e}")

if __name__ == "__main__":
    migrate()
