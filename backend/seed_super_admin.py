import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app import create_app, db
from app.models import User

def seed_super_admin():
    app = create_app()
    with app.app_context():
        try:
            email = "globalimpactinnovators26@gmail.com"
            username = "superadmin"
            password = "Admin@262702"

            # Check if user already exists
            user = User.query.filter_by(email=email).first()
            if user:
                print(f"User {email} already exists. Ensuring super_admin role...")
                user.role = 'super_admin'
                user.platform_role = 'SUPER_ADMIN'
                user.status = 'active'
                user.is_active = True
                user.set_password(password)
            else:
                print(f"Creating new Super Admin: {email}")
                user = User(
                    username=username,
                    email=email,
                    first_name="Global",
                    last_name="Impact",
                    role='super_admin',
                    platform_role='SUPER_ADMIN',
                    status='active',
                    is_active=True,
                )
                user.set_password(password)
                db.session.add(user)

            db.session.commit()
            print(f"✅ Super Admin ready: {email}")
        except Exception as e:
            db.session.rollback()
            print(f"❌ seed_super_admin failed: {str(e)}")

if __name__ == "__main__":
    seed_super_admin()
