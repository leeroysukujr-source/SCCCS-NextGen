from app import create_app, db
from app.models import User, Workspace

def permanent_anchor():
    app = create_app()
    with app.app_context():
        email = "globalimpactinnovators26@gmail.com"
        user = User.query.filter_by(email=email).first()
        ws = Workspace.query.get(1) # University of Lay Adventist of Kigali
        
        if user and ws:
            # Anchor user to workspace
            user.workspace_id = ws.id
            user.role = 'super_admin'
            user.platform_role = 'SUPER_ADMIN'
            
            # Ensure workspace has the user in its metadata if needed
            # (Assuming the model doesn't require a separate link table for superadmins)
            
            db.session.commit()
            print(f"SUCCESS: {email} is now PERMANENTLY anchored to {ws.name} (ID: {ws.id})")
        else:
            print(f"ERROR: Could not find user ({email}) or workspace (ID: 1)")

if __name__ == "__main__":
    permanent_anchor()
