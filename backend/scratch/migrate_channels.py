from app import create_app, db
import sqlalchemy

app = create_app()
with app.app_context():
    try:
        db.session.execute(sqlalchemy.text('ALTER TABLE channels ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id)'))
        db.session.commit()
        print("Successfully added class_id column to channels table.")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding column to channels: {e}")
