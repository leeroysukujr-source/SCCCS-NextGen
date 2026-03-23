"""
Migration script to create new tables for Direct Messages and Feedback
Run this script to add the new tables to your existing database
"""
from app import create_app, db
from app.models import DirectMessage, DirectMessageFile, Feedback
from config import Config

def migrate_database():
    """Create new tables for Direct Messages and Feedback"""
    app = create_app(Config)
    
    with app.app_context():
        print("Creating new tables...")
        
        try:
            # Create only the new tables
            db.create_all()
            
            print("✅ Migration completed successfully!")
            print("New tables created:")
            print("  - direct_messages")
            print("  - direct_message_files")
            print("  - feedbacks")
            print("\nExisting data has been preserved.")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            import traceback
            traceback.print_exc()
            db.session.rollback()

if __name__ == '__main__':
    migrate_database()

