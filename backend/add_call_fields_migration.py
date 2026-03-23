"""
Migration script to add call-related fields to direct_messages table.
Run this script to add the new columns to your database.
"""
from app import create_app, db
from app.models import DirectMessage

def migrate():
    """Add call-related columns to direct_messages table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Use raw SQL to check if columns exist and add them if they don't
            inspector = db.inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('direct_messages')]
            
            print("Existing columns:", existing_columns)
            
            # Add call_room_id column if it doesn't exist
            if 'call_room_id' not in existing_columns:
                print("Adding call_room_id column...")
                db.session.execute(db.text("""
                    ALTER TABLE direct_messages 
                    ADD COLUMN call_room_id INTEGER
                """))
                db.session.commit()
                print("✅ Added call_room_id column")
            else:
                print("call_room_id column already exists")
            
            # Add call_duration column if it doesn't exist
            if 'call_duration' not in existing_columns:
                print("Adding call_duration column...")
                db.session.execute(db.text("""
                    ALTER TABLE direct_messages 
                    ADD COLUMN call_duration INTEGER
                """))
                db.session.commit()
                print("✅ Added call_duration column")
            else:
                print("call_duration column already exists")
            
            # Add call_status column if it doesn't exist
            if 'call_status' not in existing_columns:
                print("Adding call_status column...")
                db.session.execute(db.text("""
                    ALTER TABLE direct_messages 
                    ADD COLUMN call_status VARCHAR(20)
                """))
                db.session.commit()
                print("✅ Added call_status column")
            else:
                print("call_status column already exists")
            
            db.session.commit()
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration error: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    migrate()

