"""
Migration script to make password_hash nullable in the users table.
This allows OAuth users to have NULL password_hash.
"""
from app import create_app, db
from config import Config
from sqlalchemy import text

def fix_password_hash_nullable():
    app = create_app(Config)
    with app.app_context():
        try:
            # Check if password_hash is already nullable
            # SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
            # But first, let's try a simpler approach - just check the constraint
            
            # For SQLite, we need to check if the column is nullable
            # Since SQLite has limited ALTER TABLE support, we'll use a workaround
            result = db.session.execute(text("PRAGMA table_info(users)"))
            columns = result.fetchall()
            
            password_hash_info = None
            for col in columns:
                if col[1] == 'password_hash':  # col[1] is the column name
                    password_hash_info = col
                    break
            
            if password_hash_info:
                # col[3] is the notnull flag (0 = nullable, 1 = not null)
                is_not_null = password_hash_info[3]
                if is_not_null:
                    print("⚠️  password_hash column is currently NOT NULL")
                    print("📝 Attempting to make it nullable...")
                    
                    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
                    # This is a more complex migration, but let's try a simpler approach first
                    # We'll use a transaction to ensure data safety
                    
                    # Step 1: Create a new table with nullable password_hash
                    db.session.execute(text("""
                        CREATE TABLE users_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            username VARCHAR(80),
                            email VARCHAR(120) NOT NULL,
                            password_hash VARCHAR(255),
                            role VARCHAR(20) NOT NULL DEFAULT 'student',
                            first_name VARCHAR(100),
                            last_name VARCHAR(100),
                            avatar_url VARCHAR(500),
                            is_active BOOLEAN DEFAULT 1,
                            created_at DATETIME,
                            updated_at DATETIME,
                            oauth_provider VARCHAR(20),
                            oauth_id VARCHAR(255)
                        )
                    """))
                    
                    # Step 2: Copy data from old table to new table
                    db.session.execute(text("""
                        INSERT INTO users_new 
                        SELECT * FROM users
                    """))
                    
                    # Step 3: Drop old table
                    db.session.execute(text("DROP TABLE users"))
                    
                    # Step 4: Rename new table
                    db.session.execute(text("ALTER TABLE users_new RENAME TO users"))
                    
                    # Step 5: Recreate indexes and constraints
                    db.session.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users(username)"))
                    db.session.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email)"))
                    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_users_oauth_id ON users(oauth_id)"))
                    db.session.execute(text("""
                        CREATE UNIQUE INDEX IF NOT EXISTS unique_oauth_user 
                        ON users(oauth_provider, oauth_id)
                    """))
                    
                    db.session.commit()
                    print("✅ Successfully made password_hash nullable")
                else:
                    print("✅ password_hash is already nullable - no changes needed")
            else:
                print("⚠️  Could not find password_hash column")
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during migration: {e}")
            print("This might happen if the table structure is different than expected.")
            print("You may need to recreate the database or manually update the schema.")
            import traceback
            traceback.print_exc()
            return False
        
        print("✅ Migration completed successfully!")
        return True

if __name__ == '__main__':
    print("=" * 60)
    print("Migration: Making password_hash nullable for OAuth users")
    print("=" * 60)
    fix_password_hash_nullable()

