from app import create_app, db
# Import models inside function to ensure app context is ready/configured if needed
import traceback

app = create_app()

def seed_default_workspace():
    from app.models import Workspace, User, WorkspaceDomain, WorkspaceIdentityPolicy
    with app.app_context():
        try:
            # 1. Create Default Workspace
            default_workspace_code = 'DEFAULT'
            workspace = Workspace.query.filter_by(code=default_workspace_code).first()
            
            if not workspace:
                print("Creating default workspace...")
                workspace = Workspace(
                    name="Default University",
                    slug="default-uni",
                    code=default_workspace_code,
                    status="active",
                    description="The default workspace for this deployment."
                )
                db.session.add(workspace)
                db.session.flush() # Flush to get ID
                print(f"Created workspace: {workspace.name} (ID: {workspace.id})")
                
                # Create Identity Policy
                policy = WorkspaceIdentityPolicy(
                    workspace_id=workspace.id,
                    require_regno=False,
                    verification_mode='ADMIN_APPROVAL',
                    allow_public_signup=True
                )
                db.session.add(policy)
                
                db.session.commit()
            else:
                print(f"Default workspace already exists: {workspace.name} (ID: {workspace.id})")

            # 2. Migrate Users (Attach existing users to default workspace if not set)
            print("Migrating unassigned users...")
            users_without_workspace = User.query.filter(User.workspace_id == None, User.role != 'super_admin').all()
            
            count = 0
            for user in users_without_workspace:
                user.workspace_id = workspace.id
                user.status = 'active' # Assume existing users are active
                count += 1
            
            if count > 0:
                db.session.commit()
                print(f"Attached {count} users to default workspace.")
            else:
                print("No unassigned users found.")
                
        except Exception as e:
            db.session.rollback()
            print("Seeding failed:")
            print(traceback.format_exc())


        # 3. Migrate Super Admin (Ensure super admin not restricted or explicitly set if needed)
        # Typically super_admin can have null workspace_id (global) or be in a specific one.
        # User requirement says: "superadmin can bypass scoping only for global admin endpoints."
        # This implies superadmin might not need a workspace_id, or can switch.
        # We leave super_admins as is (nullable workspace_id).

if __name__ == '__main__':
    seed_default_workspace()
