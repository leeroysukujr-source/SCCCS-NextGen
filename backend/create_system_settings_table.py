
from app import create_app, db
from app.models.system_settings import SystemSetting

app = create_app()

def create_table():
    with app.app_context():
        # Check if table exists
        inspector = db.inspect(db.engine)
        if 'system_settings' not in inspector.get_table_names():
            print("Creating system_settings table...")
            SystemSetting.__table__.create(db.engine)
            print("Table created.")
        else:
            print("Table system_settings already exists.")

if __name__ == '__main__':
    create_table()
