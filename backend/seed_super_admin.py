import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app import create_app, db
from app.models import User

def seed_super_admin():
    app = create_app()
    with app.app_context():
        email = "globalimpactinnovators26@gmail.com"
        username = "superadmin"
        password = "Admin@262702"
        
        # Check if user already exists
        user = User.query.filter_by(email=email).first()
        if user:
            print(f"User {email} already exists. Updating role to super_admin...")
            user.role = 'super_admin'
            user.set_password(password)
        else:
            print(f"Creating new Super Admin: {email}")
            user = User(
                username=username,
                email=email,
                first_name="Global",
                last_name="Impact",
                role='super_admin'
            )
            user.set_password(password)
            db.session.add(user)
        
        db.session.commit()
        print("Super Admin seeded successfully.")

if __name__ == "__main__":
    seed_super_admin()
