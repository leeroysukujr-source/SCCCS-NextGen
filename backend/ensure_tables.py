from app import create_app, db

app = create_app()

with app.app_context():
    print("Creating all tables (including new Tutor models)...")
    db.create_all()
    print("Database update complete.")
