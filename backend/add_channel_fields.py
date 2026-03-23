"""Add avatar_url and share_code to channels table"""
from app import create_app, db
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    try:
        # Check which columns exist
        inspector = inspect(db.engine)
        existing_columns = [col['name'] for col in inspector.get_columns('channels')]
        
        print(f"Existing columns: {existing_columns}")
        
        # Add avatar_url if it doesn't exist
        if 'avatar_url' not in existing_columns:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE channels ADD COLUMN avatar_url VARCHAR(500)"))
                conn.commit()
            print("✅ Successfully added avatar_url column")
        else:
            print("ℹ️  avatar_url column already exists")
        
        # Add share_code if it doesn't exist
        if 'share_code' not in existing_columns:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE channels ADD COLUMN share_code VARCHAR(50)"))
                conn.commit()
            print("✅ Successfully added share_code column")
        else:
            print("ℹ️  share_code column already exists")
        
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

