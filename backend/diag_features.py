import os
import sys
import json

# Add backend to path
sys.path.append(os.getcwd())

from app import create_app, db
from app.models import GlobalFeatureFlag

app = create_app()
with app.app_context():
    print("--- Diagnostic for GlobalFeatureFlag ---")
    try:
        # Check if table exists by querying
        flags = GlobalFeatureFlag.query.all()
        print(f"Success: Found {len(flags)} flags")
        for f in flags:
            print(f"Flag: {f.name}, Enabled: {f.is_enabled}")
            try:
                print(f"  to_dict(): {f.to_dict()}")
            except Exception as e:
                print(f"  to_dict() FAILED: {e}")
    except Exception as e:
        print(f"FAILED to query GlobalFeatureFlag: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Listing all tables in DB ---")
    import sqlite3
    db_path = os.path.join('instance', 'scccs.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in cursor.fetchall()]
    print("Tables in sqlite3:", tables)
    
    if 'global_feature_flags' in tables:
        cursor.execute("PRAGMA table_info(global_feature_flags)")
        print("Schema for global_feature_flags (sqlite3):")
        for col in cursor.fetchall():
            print(col)
    else:
        print("global_feature_flags table NOT FOUND in sqlite3 check")
    conn.close()
