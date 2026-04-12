import os
import sys

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app import create_app, db
from app.models import User

def elevate_admin():
    app = create_app()
    with app.app_context():
        try:
            email = "globalimpactinnovators26@gmail.com"
            print(f"🚀 SURGICAL ELEVATION: Targeting {email}...")
            
            # Find the user (case-insensitive)
            user = User.query.filter(User.email.ilike(email)).first()
            
            if user:
                print(f"✅ Found user ID {user.id}. Elevating to SUPER_ADMIN...")
                user.platform_role = 'SUPER_ADMIN'
                user.role = 'super_admin'  # Standard system role
                user.status = 'active'
                user.is_active = True
                
                # If they don't have a username, give them one based on email
                if not user.username:
                    user.username = email.split('@')[0]
                
                db.session.commit()
                print(f"🎉 SUCCESS! {email} is now a Global SuperAdmin.")
            else:
                print(f"❌ User {email} not found in database yet. The seeder will create it anyway.")
                # We'll let the standard seeder handle creation if they aren't there yet
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Elevation Failed: {str(e)}")

if __name__ == "__main__":
    elevate_admin()
