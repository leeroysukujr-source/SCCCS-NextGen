from app import create_app, db
from app.models import Announcement, UserActivity
from sqlalchemy import text

app = create_app()

def migrate_phase8():
    print("🚀 Starting Phase 8 Migration: Analytics & Announcements...")
    with app.app_context():
        try:
             # db.create_all() safely checks for existence
             db.create_all()
             print("✅ Phase 8 Schema Migration Completed via create_all().")
             
        except Exception as e:
            print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate_phase8()
