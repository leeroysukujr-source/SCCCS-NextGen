from app import create_app, db
from app.models import User, Workspace

app = create_app()
with app.app_context():
    email = "sukujrmensahq@hotmail.com"
    u = User.query.filter((User.email == email) | (User.username == "sukujrmensahq")).first()
    if u:
        print(f"ID: {u.id}")
        print(f"Username: {u.username}")
        print(f"Email: {u.email}")
        print(f"Role: {u.role}")
        print(f"Workspace ID: {u.workspace_id}")
        print(f"Status: {u.status}")
        if u.workspace_obj:
            print(f"Workspace Name: {u.workspace_obj.name}")
            print(f"Workspace Code: {u.workspace_obj.code}")
    else:
        print("User not found")
