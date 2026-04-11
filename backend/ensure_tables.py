import os
import sys
from sqlalchemy import text

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def titan_sync():
    """Titan Sync: Forced ordered cleanup and total rebuild to break through catalog corruption."""
    app = create_app()
    with app.app_context():
        engine = db.engine
        print("\n" + "="*70)
        print("=== TITAN SYNC: FORCED DATABASE RECOVERY & REBUILD ===")
        print("="*70)
        
        try:
            with engine.connect() as conn:
                conn.execute(text("COMMIT"))
                
                # 1. THE ULTIMATE PURGE
                print("💣 1. Annihilating public schema and ALL lingering relations...")
                conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
                conn.execute(text("CREATE SCHEMA public"))
                conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
                
                # 2. TARGETED GHOST PURGE (Manual Index Removal)
                # Even with CASCADE, some indices can linger if they are partially corruped
                ghost_targets = [
                    "ix_system_settings_key", "ix_users_username", "ix_users_email",
                    "ix_workspaces_slug", "ix_workspaces_code", "ix_invites_token",
                    "ix_global_feature_flags_name", "ix_classes_code", "ix_rooms_room_code",
                    "ix_channels_share_code", "ix_channel_invites_token"
                ]
                for target in ghost_targets:
                    try:
                        conn.execute(text(f"DROP INDEX IF EXISTS {target} CASCADE"))
                    except: pass
                
                conn.execute(text("COMMIT"))
                print("   ✅ Recovery Complete. Environment is pristine.")

            # 3. REGISTER MODELS
            from app import models
            print("💎 2. Models Registered.")

            # 4. REBUILD FROM SCRATCH
            print("💎 3. Executing Forced Table Creation...")
            # We clear metadata to be absolutely sure we aren't holding stale structures
            db.metadata.clear()
            # We re-import within the context to be certain
            import app.models # Final trigger
            
            db.metadata.create_all(bind=engine)
            
            # 5. PHYSICAL VERIFICATION (Must see 'users' table or fail)
            with engine.connect() as conn:
                res = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
                tables = [row[0] for row in res]
                print(f"   📊 FINAL AUDIT: {len(tables)} tables verified in Neon DB.")
                print(f"   📊 TIER 1 TABLES: {', '.join(tables)}")
                
                if 'users' not in tables:
                     raise Exception("CRITICAL FAILURE: Users table failed to commit to physical storage.")
                
                conn.execute(text("COMMIT"))

            print("="*70)
            print("=== SUCCESS: THE DATABASE HAS BEEN RESURRECTED ===")
            print("="*70 + "\n")
            return True
            
        except Exception as e:
            print(f"\n!!! TITAN SYNC FATAL ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = titan_sync()
    if not success:
        sys.exit(1)
