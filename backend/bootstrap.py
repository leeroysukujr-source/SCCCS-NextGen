import os
import sys
from sqlalchemy import text

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def nuclear_bootstrap():
    """Nuclear Bootstrap: Forces a fresh schema 'scccs_prod' and builds all models inside it."""
    app = create_app()
    with app.app_context():
        engine = db.engine
        print("\n" + "="*70)
        print("=== NUCLEAR BOOTSTRAP: BUILDING FRESH SCHEMAS ===")
        print("="*70)
        
        try:
            with engine.connect() as conn:
                conn.execute(text("COMMIT"))
                print("1. Annihilating old environment (Public & Prod)...")
                conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
                conn.execute(text("CREATE SCHEMA public"))
                conn.execute(text("DROP SCHEMA IF EXISTS scccs_prod CASCADE"))
                conn.execute(text("CREATE SCHEMA scccs_prod"))
                conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
                conn.execute(text("GRANT ALL ON SCHEMA scccs_prod TO public"))
                conn.execute(text("COMMIT"))
                print("   [OK] Environment is now pristine.")

            # IMPORTANT: Re-map SQLAlchemy to the new schema
            # Since we added search_path to the URI in config.py, 
            # create_all will now default to scccs_prod.
            
            print("2. Injecting Application Architecture...")
            # Trigger model imports to ensure they are in metadata
            from app import models
            import app.models
            
            db.metadata.create_all(bind=engine)
            print("   [OK] Architecture successfully pushed to 'scccs_prod'.")

            # Verify 'users' table specifically
            with engine.connect() as conn:
                res = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'scccs_prod'"))
                tables = [row[0] for row in res]
                print(f"   [AUDIT] PHYSICAL VERIFICATION: {', '.join(tables)}")
                if 'users' not in tables:
                     raise Exception("Critical: 'users' table failed to build even in fresh schema.")
                conn.execute(text("COMMIT"))

            print("="*70)
            print("=== SUCCESS: SYSTEM IS DEPLOYED ON SCHEMALESS INFRA ===")
            print("="*70 + "\n")
            return True
        except Exception as e:
            print(f"\n[ERROR] Bootstrap Failed: {e}")
            return False

if __name__ == "__main__":
    nuclear_bootstrap()
