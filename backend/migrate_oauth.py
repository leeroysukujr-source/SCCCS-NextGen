"""
Migration script to add OAuth fields to User model
Run this once to update existing database schema
"""
from app import create_app, db
from config import Config
from sqlalchemy import text

def migrate_oauth():
    app = create_app(Config)
    with app.app_context():
        try:
            # Check if oauth_provider column exists
            result = db.session.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]
            
            if 'oauth_provider' not in columns:
                print("Adding OAuth columns to users table...")
                db.session.execute(text("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20)"))
                db.session.execute(text("ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255)"))
                db.session.commit()
                print("✓ OAuth columns added successfully")
            else:
                print("✓ OAuth columns already exist")
            
            # Make username nullable if it's not already
            # SQLite doesn't support ALTER COLUMN, so we'll skip this
            # The model already has nullable=True, so new users will work
            
            print("Migration completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"Migration error: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    migrate_oauth()

