
from app import create_app, db
from app.models.document import Document, DocumentPermission
from app.models import User
from sqlalchemy import desc
import sys

# Disable socketio for this check to avoid async issues
import os
os.environ['SOCKETIO_ASYNC_MODE'] = 'threading'
os.environ['LIVEKIT_AUTOSTART'] = 'false'

app = create_app()
with app.app_context():
    # Mock user ID 3 (based on logs seeing "id: 3" in presence update)
    user = User.query.get(3)
    if not user:
        user = User.query.first()
        if not user:
            print("No user found")
            sys.exit(0)
            
    print(f"Testing for user {user.username} ({user.id})")
    current_user_id = user.id
    
    query = Document.query.filter(Document.workspace_id == user.workspace_id)
    
    # Simulate the default filter path
    query = query.filter(Document.status == 'active')
    query = query.filter(
        (Document.owner_id == current_user_id) |
        (Document.visibility == 'public') |
        (Document.visibility == 'workspace') |
        (Document.id.in_(
            db.session.query(DocumentPermission.document_id).filter_by(user_id=current_user_id)
        ))
    )
    
    print("Query constructed.")
    # print(query.statement.compile(compile_kwargs={"literal_binds": True}))
    
    print("Executing...")
    try:
        # documents = query.order_by(Document.updated_at.desc()).all()
        documents = query.all()
        print(f"Found {len(documents)} documents")
    except Exception as e:
        print("CRASHED:")
        print(e)
        import traceback
        traceback.print_exc()
