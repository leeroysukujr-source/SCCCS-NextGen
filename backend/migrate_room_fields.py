"""
Migration script to add scheduled_at and meeting_type fields to rooms table.
"""
from app import create_app, db
from config import Config
from sqlalchemy import text

def migrate_room_fields():
    app = create_app(Config)
    with app.app_context():
        try:
            # Check if scheduled_at column exists
            result = db.session.execute(text("PRAGMA table_info(rooms)"))
            columns = result.fetchall()
            
            has_scheduled_at = any(col[1] == 'scheduled_at' for col in columns)
            has_meeting_type = any(col[1] == 'meeting_type' for col in columns)
            
            if not has_scheduled_at:
                print("📝 Adding 'scheduled_at' column to rooms table...")
                db.session.execute(text("ALTER TABLE rooms ADD COLUMN scheduled_at DATETIME"))
                print("✅ Added 'scheduled_at' column")
            else:
                print("✅ 'scheduled_at' column already exists")
            
            if not has_meeting_type:
                print("📝 Adding 'meeting_type' column to rooms table...")
                db.session.execute(text("ALTER TABLE rooms ADD COLUMN meeting_type VARCHAR(20) DEFAULT 'instant'"))
                print("✅ Added 'meeting_type' column")
            else:
                print("✅ 'meeting_type' column already exists")
            
            db.session.commit()
            print("✅ Migration completed successfully!")
            return True
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during migration: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    print("=" * 60)
    print("Migration: Adding scheduled_at and meeting_type to rooms")
    print("=" * 60)
    migrate_room_fields()

