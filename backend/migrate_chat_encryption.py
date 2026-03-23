"""
Migration script to add encryption and message type fields to channels and messages
"""
from app import create_app, db
from config import Config
from sqlalchemy import text

def migrate_chat_encryption():
    app = create_app(Config)
    with app.app_context():
        try:
            # Add encryption fields to channels
            try:
                db.session.execute(text("ALTER TABLE channels ADD COLUMN encryption_key TEXT"))
                print("✅ Added 'encryption_key' column to channels")
            except Exception as e:
                print(f"⚠️  encryption_key column might already exist: {e}")
            
            try:
                db.session.execute(text("ALTER TABLE channels ADD COLUMN is_encrypted BOOLEAN DEFAULT 1"))
                print("✅ Added 'is_encrypted' column to channels")
            except Exception as e:
                print(f"⚠️  is_encrypted column might already exist: {e}")
            
            # Add message type and encryption fields to messages
            try:
                db.session.execute(text("ALTER TABLE messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text'"))
                print("✅ Added 'message_type' column to messages")
            except Exception as e:
                print(f"⚠️  message_type column might already exist: {e}")
            
            try:
                db.session.execute(text("ALTER TABLE messages ADD COLUMN is_encrypted BOOLEAN DEFAULT 1"))
                print("✅ Added 'is_encrypted' column to messages")
            except Exception as e:
                print(f"⚠️  is_encrypted column might already exist: {e}")
            
            # Add MIME type and encryption to files
            try:
                db.session.execute(text("ALTER TABLE files ADD COLUMN mime_type VARCHAR(100)"))
                print("✅ Added 'mime_type' column to files")
            except Exception as e:
                print(f"⚠️  mime_type column might already exist: {e}")
            
            try:
                db.session.execute(text("ALTER TABLE files ADD COLUMN is_encrypted BOOLEAN DEFAULT 1"))
                print("✅ Added 'is_encrypted' column to files")
            except Exception as e:
                print(f"⚠️  is_encrypted column might already exist: {e}")
            
            db.session.commit()
            print("✅ Migration completed successfully!")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during migration: {e}")

if __name__ == '__main__':
    print("============================================================")
    print("Migration: Adding encryption and message type fields")
    print("============================================================")
    migrate_chat_encryption()

