
import requests
from app import create_app, db
from app.models.collaboration import Presence
from app.models import User
import sys

app = create_app()

def check_presence():
    with app.app_context():
        # Check if table exists
        try:
            Presence.query.first()
            print("Presence table exists.")
        except Exception as e:
            print(f"Error accessing Presence table: {e}")
            return

        # Check if we can create a presence record locally
        try:
            # Need a user first
            user = User.query.first()
            if not user:
                print("No users found to test presence.")
                return
            
            print(f"Testing presence for user: {user.username} ({user.id})")
            
            p = Presence.query.filter_by(user_id=user.id).first()
            if not p:
                p = Presence(user_id=user.id)
                db.session.add(p)
                db.session.commit()
                print("Created new presence record locally.")
            else:
                p.status = 'test_update'
                db.session.commit()
                print("Updated existing presence record locally.")
                
        except Exception as e:
            print(f"Error manipulating Presence locally: {e}")

if __name__ == "__main__":
    check_presence()
