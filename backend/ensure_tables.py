import os
import sys
from sqlalchemy import text

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def infinity_sync():
    """Infinity Sync: Total annihilation followed by a forced, cold-rebuild of the schema."""
    app = create_app()
    with app.app_context():
        engine = db.engine
        print("\n" + "="*50)
        print("=== INFINITY SYNC: COLD-REBUILDING DATABASE ===")
        print("="*50)
        
        try:
            with engine.connect() as conn:
                # Force commit outside transaction block
                conn.execute(text("COMMIT"))
                
                print("1. Annihilating existing schema 'public'...")
                conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
                conn.execute(text("CREATE SCHEMA public"))
                conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
                conn.execute(text("COMMENT ON SCHEMA public IS 'standard public schema'"))
                conn.execute(text("COMMIT"))
                print("   ✅ Schema wiped and recreated.")
                
            print("2. Clearing SQLAlchemy Metadata Cache...")
            db.metadata.clear()
            
            print("3. Building Schema from Models...")
            # Use metadata.create_all directly on the engine for maximum reliability
            db.metadata.create_all(bind=engine)
            print("   ✅ All tables created successfully.")
            
            with engine.connect() as conn:
                print("4. Finalizing Transaction...")
                conn.execute(text("COMMIT"))
                
            print("="*50)
            print("=== SUCCESS: Database is now in a pristine state ===")
            print("="*50 + "\n")
            return True
        except Exception as e:
            print(f"\n!!! CRITICAL SYNC FAILURE: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = infinity_sync()
    if not success:
        sys.exit(1)
