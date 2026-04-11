import os
import sys
from sqlalchemy import text

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def final_sync():
    """The Final Sync: Explicit, model-aware schema reconstruction."""
    app = create_app()
    with app.app_context():
        engine = db.engine
        print("\n" + "="*50)
        print("=== FINAL SYNC: RECONSTRUCTING USER SCHEMA ===")
        print("="*50)
        
        try:
            with engine.connect() as conn:
                conn.execute(text("COMMIT"))
                
                print("1. Annihilating public schema...")
                conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
                conn.execute(text("CREATE SCHEMA public"))
                conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
                conn.execute(text("COMMIT"))
                print("   ✅ Database is now blank.")
                
            print("2. Triggering Model Registration...")
            # We explicitly import models inside the context to ensure 
            # SQLAlchemy's metadata object is fully populated.
            from app import models
            import app.models
            
            print("3. Physically Writing Tables to Neon DB...")
            # create_all uses the populated metadata to build the real tables
            db.metadata.create_all(bind=engine)
            
            # Double check with a raw query
            with engine.connect() as conn:
                res = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
                tables = [row[0] for row in res]
                print(f"   📊 Tables created: {', '.join(tables)}")
                if 'users' not in tables:
                     raise Exception("Critical Failure: 'users' table was NOT created.")
                
                conn.execute(text("COMMIT"))
                
            print("="*50)
            print("=== SUCCESS: Database Architecture is LIVE ===")
            print("="*50 + "\n")
            return True
        except Exception as e:
            print(f"\n!!! SYNC FAILURE: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = final_sync()
    if not success:
        sys.exit(1)
