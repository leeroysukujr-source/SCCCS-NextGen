from app import create_app, db
from app.models import User
import sys

def elevate():
    app = create_app()
    with app.app_context():
        email = "globalimpactinnovators26@gmail.com"
        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"User {email} not found. Creating new superadmin...")
            user = User(
                username="superadmin_global",
                email=email,
                role="super_admin",
                platform_role="SUPER_ADMIN",
                workspace_id=None,
                status="active"
            )
            user.set_password("Admin@262702")
            db.session.add(user)
        else:
            print(f"User {email} found. Elevating to Global Superadmin...")
            user.role = "super_admin"
            user.platform_role = "SUPER_ADMIN"
            user.workspace_id = None # Global access
            user.status = "active"
            user.set_password("Admin@262702")
            
        db.session.commit()
        print(f"SUCCESS: {email} is now a Global Superadmin.")

if __name__ == "__main__":
    elevate()
