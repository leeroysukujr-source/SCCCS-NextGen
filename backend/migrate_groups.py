import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('instance/scccs.db')
        cursor = conn.cursor()
        
        print("Migrating 'documents' table...")
        try:
            cursor.execute('ALTER TABLE documents ADD COLUMN group_id INTEGER REFERENCES assignment_groups(id)')
            print("Added 'group_id' to 'documents'")
        except sqlite3.OperationalError as e:
            print(f"Skipped 'documents': {e}")

        print("Migrating 'files' table...")
        try:
            cursor.execute('ALTER TABLE files ADD COLUMN group_id INTEGER REFERENCES assignment_groups(id)')
            print("Added 'group_id' to 'files'")
        except sqlite3.OperationalError as e:
            print(f"Skipped 'files': {e}")
            
        conn.commit()
        conn.close()
        print("Migration process finished.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == '__main__':
    migrate()
