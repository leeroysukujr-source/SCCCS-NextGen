import os
from app import create_app, db
from sqlalchemy import text
from app.models import Assignment, AssignmentSubmission, AssignmentGrade

def fix_schema():
    app = create_app()
    with app.app_context():
        print("Ensuring all tables exist...")
        db.create_all()
        print("db.create_all() executed.")

        print("Checking for missing columns in existing tables...")
        
        # 1. assignments.rubric
        try:
            db.session.execute(text("SELECT rubric FROM assignments LIMIT 1"))
            print("assignments.rubric: EXISTS")
        except Exception:
            db.session.rollback()
            print("assignments.rubric: MISSING. Adding it...")
            try:
                db.session.execute(text("ALTER TABLE assignments ADD COLUMN rubric TEXT"))
                db.session.commit()
                print("Successfully added assignments.rubric")
            except Exception as e:
                print(f"Error adding assignments.rubric: {e}")
                db.session.rollback()

        # 2. assignment_grades.rubric_scores
        # Note: If it was just created by create_all, it should have it.
        # But if it already existed but was missing the column, we check.
        try:
            db.session.execute(text("SELECT rubric_scores FROM assignment_grades LIMIT 1"))
            print("assignment_grades.rubric_scores: EXISTS")
        except Exception:
            db.session.rollback()
            print("assignment_grades.rubric_scores: MISSING. Adding it...")
            try:
                db.session.execute(text("ALTER TABLE assignment_grades ADD COLUMN rubric_scores TEXT"))
                db.session.commit()
                print("Successfully added assignment_grades.rubric_scores")
            except Exception as e:
                print(f"Error adding rubric_scores: {e}")
                db.session.rollback()

        print("Schema fix complete.")

if __name__ == "__main__":
    fix_schema()
