from app import create_app, db
from app.models import User, Workspace

app = create_app()
with app.app_context():
    email = "leeroysukujr@gmail.com"
    users = User.query.filter_by(email=email).all()
    with open('user_info.txt', 'w') as f:
        f.write(f"Found {len(users)} users for {email}:\n")
        for u in users:
            f.write(f"ID: {u.id}, Username: {u.username}, Role: {u.role}, Workspace: {u.workspace_id}, Status: {u.status}\n")
            if u.workspace_obj:
                f.write(f"  Workspace Name: {u.workspace_obj.name}, Code: {u.workspace_obj.code}\n")
        
        # Also check if there's an admin for "Unilak" workspace with a different email?
        unilak = Workspace.query.filter(Workspace.name.ilike('%unilak%')).first()
        if unilak:
            f.write(f"Unilak Workspace ID: {unilak.id}, Name: {unilak.name}\n")
            admins = User.query.filter_by(workspace_id=unilak.id, role='admin').all()
            f.write(f"Admins in Unilak: {[a.email for a in admins]}\n")
