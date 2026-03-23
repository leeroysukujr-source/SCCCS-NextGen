
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ['SOCKETIO_ASYNC_MODE'] = 'threading'
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    print(f"Users: {User.query.count()}")
    for u in User.query.all():
        print(f"{u.id}: {u.username} ({u.role})")
