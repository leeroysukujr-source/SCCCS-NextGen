from app import create_app, db
from app.models import User
from sqlalchemy import func

app = create_app()

with app.app_context():
    email = 'globalimpactinnovators26@gmail.com'
    print(f"Checking for all users matching email: {email}")
    users = User.query.filter(func.lower(User.email) == email.lower()).all()
    print(f"Found {len(users)} accounts.")
    for u in users:
        print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, PlatformRole: {u.platform_role}, Workspace: {u.workspace_id}")

    # Check for all users in general
    print("\nALL USERS IN DB:")
    all_users = User.query.all()
    for u in all_users:
        print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, PlatformRole: {u.platform_role}, Workspace: {u.workspace_id}")
