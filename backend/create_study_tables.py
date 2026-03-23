
from app import create_app, db
from app.models.study_documents import StudyRoomDocument, StudyRoomDocumentCollaborator, StudyRoomDocumentVersion

app = create_app()

with app.app_context():
    print("Creating tables for Study Docs...")
    db.create_all()
    print("Tables created successfully.")
