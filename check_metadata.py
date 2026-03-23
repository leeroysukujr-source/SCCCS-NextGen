from app import create_app, db
from config import Config
import app.models # ensure they are loaded

app = create_app(Config)
with app.app_context():
    print(f"Tables in metadata: {list(db.metadata.tables.keys())}")
    file_table = db.metadata.tables.get('files')
    if file_table is not None:
        print(f"Columns in 'files' from metadata: {[c.name for c in file_table.columns]}")
    else:
        print("'files' table NOT in metadata")
