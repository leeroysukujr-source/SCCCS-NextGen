import os
from app import create_app, db
from app.models import Room

app = create_app()
with app.app_context():
    rooms = Room.query.all()
    print("Rooms:", [(r.id, r.name, r.is_active) for r in rooms])
