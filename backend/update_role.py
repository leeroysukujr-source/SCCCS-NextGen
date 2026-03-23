from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    email = "leeroysukujr@gmail.com"
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"Updating user {user.username} (ID: {user.id}) from {user.role} to 'admin'")
        user.role = 'admin'
        db.session.commit()
        print("Done.")
    else:
        print("User not found.")
