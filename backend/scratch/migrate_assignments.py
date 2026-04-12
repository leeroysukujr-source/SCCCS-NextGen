from app import create_app, db
import sqlalchemy

app = create_app()
with app.app_context():
    try:
        # Use session.execute for SAFELY running SQL in SQLAlchemy 2.0
        db.session.execute(sqlalchemy.text('ALTER TABLE assignments ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id)'))
        db.session.commit()
        print("Successfully added class_id column to assignments table.")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding column: {e}")
