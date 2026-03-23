from app import create_app, db
from config import Config
import app.models

app = create_app(Config)
with app.app_context():
    file_table = db.metadata.tables.get('files')
    print(",".join([c.name for c in file_table.columns]))
