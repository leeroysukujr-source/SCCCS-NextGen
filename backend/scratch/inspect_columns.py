from app import create_app, db
from sqlalchemy import inspect
import os

app = create_app()
with app.app_context():
    print(f"CHANNELS: {[c['name'] for c in inspect(db.engine).get_columns('channels')]}")
    print(f"ASSIGNMENTS: {[c['name'] for c in inspect(db.engine).get_columns('assignments')]}")
