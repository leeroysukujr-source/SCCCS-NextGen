"""
Create new tables for chat features (reactions, polls, etc.)
Run this after the column migration to create the new feature tables
"""
import sqlite3
from pathlib import Path

def create_chat_feature_tables():
    """Create new tables for advanced chat features"""
    # Find the database file
    instance_dir = Path(__file__).parent / 'instance'
    db_path = instance_dir / 'scccs.db'
    
    if not db_path.exists():
        db_path = instance_dir / 'database.db'
    
    if not db_path.exists():
        print(f"Database not found in {instance_dir}")
        print("Please run the app first to create the database")
        return
    
    print(f"Connecting to database at: {db_path}")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    print("Creating chat feature tables...")
    
    try:
        # Message Reactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS message_reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                emoji VARCHAR(50) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(message_id, user_id, emoji)
            )
        """)
        print("  ✓ Created message_reactions table")
        
        # Message Read Receipts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS message_read_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(message_id, user_id)
            )
        """)
        print("  ✓ Created message_read_receipts table")
        
        # Pinned Messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pinned_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                message_id INTEGER NOT NULL,
                pinned_by INTEGER NOT NULL,
                pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                note VARCHAR(500),
                FOREIGN KEY (channel_id) REFERENCES channels(id),
                FOREIGN KEY (message_id) REFERENCES messages(id),
                FOREIGN KEY (pinned_by) REFERENCES users(id)
            )
        """)
        print("  ✓ Created pinned_messages table")
        
        # Message Forwards table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS message_forwards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_message_id INTEGER NOT NULL,
                forwarded_message_id INTEGER NOT NULL,
                forwarded_by INTEGER NOT NULL,
                forwarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                forwarded_to_channel_id INTEGER NOT NULL,
                FOREIGN KEY (original_message_id) REFERENCES messages(id),
                FOREIGN KEY (forwarded_message_id) REFERENCES messages(id),
                FOREIGN KEY (forwarded_by) REFERENCES users(id),
                FOREIGN KEY (forwarded_to_channel_id) REFERENCES channels(id)
            )
        """)
        print("  ✓ Created message_forwards table")
        
        # Message Edit History table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS message_edit_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                old_content TEXT,
                edited_by INTEGER NOT NULL,
                edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id),
                FOREIGN KEY (edited_by) REFERENCES users(id)
            )
        """)
        print("  ✓ Created message_edit_history table")
        
        # Channel Polls table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channel_polls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                message_id INTEGER NOT NULL UNIQUE,
                question VARCHAR(500) NOT NULL,
                options TEXT NOT NULL,
                is_multiple_choice BOOLEAN DEFAULT 0,
                is_anonymous BOOLEAN DEFAULT 0,
                expires_at DATETIME,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'active',
                FOREIGN KEY (channel_id) REFERENCES channels(id),
                FOREIGN KEY (message_id) REFERENCES messages(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """)
        print("  ✓ Created channel_polls table")
        
        # Poll Votes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS poll_votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                poll_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                option_index INTEGER NOT NULL,
                voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (poll_id) REFERENCES channel_polls(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(poll_id, user_id, option_index)
            )
        """)
        print("  ✓ Created poll_votes table")
        
        # Channel Topics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channel_topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                icon VARCHAR(50),
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_archived BOOLEAN DEFAULT 0,
                FOREIGN KEY (channel_id) REFERENCES channels(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """)
        print("  ✓ Created channel_topics table")
        
        # Scheduled Messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                author_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                message_type VARCHAR(20) DEFAULT 'text',
                scheduled_for DATETIME NOT NULL,
                sent_at DATETIME,
                status VARCHAR(20) DEFAULT 'scheduled',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels(id),
                FOREIGN KEY (author_id) REFERENCES users(id)
            )
        """)
        print("  ✓ Created scheduled_messages table")
        
        # Channel Mutes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channel_mutes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                muted_until DATETIME,
                muted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(channel_id, user_id)
            )
        """)
        print("  ✓ Created channel_mutes table")
        
        conn.commit()
        print("\n✓ All chat feature tables created successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    create_chat_feature_tables()

