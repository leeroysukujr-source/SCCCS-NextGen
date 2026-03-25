import sqlalchemy
from app import create_app, db

app = create_app()
with app.app_context():
    print("Dropping orphaned index...")
    try:
        db.session.execute(sqlalchemy.text('DROP INDEX IF EXISTS ix_system_settings_key CASCADE;'))
        db.session.commit()
        print("Dropped.")
    except Exception as e:
        print("Failed to drop index:", e)
        db.session.rollback()

    print("Running db.create_all()...")
    db.create_all()
    print("Success!")
