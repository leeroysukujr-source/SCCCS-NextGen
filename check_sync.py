from app import create_app, db
from config import Config
import app.models
import sqlite3

def check_sync():
    app = create_app(Config)
    db_path = 'backend/instance/scccs.db'
    conn = sqlite3.connect(db_path)
    
    with app.app_context():
        for table_name, table in db.metadata.tables.items():
            cursor = conn.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
            if not cursor.fetchone():
                print(f"MISSING TABLE: {table_name}")
                continue
                
            cursor = conn.execute(f"PRAGMA table_info({table_name})")
            db_cols = [r[1] for r in cursor.fetchall()]
            md_cols = [c.name for c in table.columns]
            
            missing_in_db = [c for c in md_cols if c not in db_cols]
            if missing_in_db:
                print(f"Table {table_name}: MISSING COLUMNS in DB: {missing_in_db}")
            
    conn.close()

if __name__ == '__main__':
    check_sync()
