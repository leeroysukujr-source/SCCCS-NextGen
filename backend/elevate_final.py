from app import create_app, db
from app.models import User

def elevate_user():
    app = create_app()
    with app.app_context():
        email = "globalimpactinnovators26@gmail.com"
        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"Error: User {email} not found.")
            return
            
        # The key fix: Platform role must be all caps 'SUPER_ADMIN'
        user.platform_role = 'SUPER_ADMIN'
        user.role = 'super_admin'
        
        db.session.commit()
        print(f"SUCCESS: {email} is now a Platform SUPER_ADMIN.")
        print(f"Platform Role: {user.platform_role}")
        print(f"Role: {user.role}")

if __name__ == "__main__":
    elevate_user()
