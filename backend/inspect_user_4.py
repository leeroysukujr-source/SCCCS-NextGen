from app import create_app, db
from app.models import User, Workspace, WorkspaceMembership

app = create_app()
with app.app_context():
    user_id = 4
    u = User.query.get(user_id)
    if u:
        print(f"User ID: {u.id}")
        print(f"Username: {u.username}")
        print(f"Role: {u.role}")
        print(f"Workspace ID: {u.workspace_id}")
        
        mems = WorkspaceMembership.query.filter_by(user_id=u.id).all()
        print(f"Memberships: {len(mems)}")
        for m in mems:
            print(f"  Workspace: {m.workspace.name if m.workspace else 'Unknown'} (ID: {m.workspace_id}), Role: {m.role}")
            
        owned_workspaces = Workspace.query.filter_by(admin_id=u.id).all()
        print(f"Admin of Workspaces: {len(owned_workspaces)}")
        for w in owned_workspaces:
            print(f"  Name: {w.name} (ID: {w.id})")
    else:
        print("User not found")
