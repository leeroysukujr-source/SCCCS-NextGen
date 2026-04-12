from app import create_app, db
from sqlalchemy import inspect
import os

app = create_app()
with app.app_context():
    columns = [c['name'] for c in inspect(db.engine).get_columns('channels')]
    print(f"COLUMNS: {columns}")
