from app import create_app, db
from app.models import User
from config import Config

def dump_users():
    app = create_app(Config)
    with app.app_context():
        users = User.query.all()
        print(f"Total users: {len(users)}")
        for u in users:
            print(f"ID: {u.id} | Username: {u.username} | Role: {u.role}")

if __name__ == '__main__':
    dump_users()
