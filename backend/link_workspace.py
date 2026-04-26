from app import create_app, db
from app.models import User, Workspace

def link_user():
    app = create_app()
    with app.app_context():
        email = "globalimpactinnovators26@gmail.com"
        slug = "unilak.edu.rw"
        
        user = User.query.filter_by(email=email).first()
        ws = Workspace.query.filter_by(slug=slug).first()
        
        if not user:
            print(f"Error: User {email} not found.")
            return
        if not ws:
            print(f"Error: Workspace {slug} not found.")
            return
            
        user.workspace_id = ws.id
        # Also ensure they are the admin_id of the workspace
        ws.admin_id = user.id
        
        db.session.commit()
        print(f"SUCCESS: {email} is now linked to {ws.name} (ID: {ws.id})")

if __name__ == "__main__":
    link_user()
