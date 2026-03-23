import sys
import os
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.document import Document
from app.models import Assignment

app = create_app()

with app.app_context():
    print("Checking Documents...")
    docs = Document.query.all()
    for d in docs:
        print(f"Doc ID: {d.id}, Title: {d.title}, Type: {d.doc_type}, Visibility: {d.visibility}, Starred: {getattr(d, 'is_starred', 'N/A')}")
        if d.doc_type == 'assignment':
            # Check content for assignmentId
            import json
            try:
                data = json.loads(d.content)
                asg_id = data.get('assignmentId')
                print(f"  -> Linked Assignment ID: {asg_id}")
                if asg_id:
                    asg = Assignment.query.get(asg_id)
                    if asg:
                        print(f"  -> Assignment Status: {asg.status}")
                    else:
                        print("  -> Assignment NOT FOUND")
            except Exception as e:
                print(f"  -> Content parse error: {e}")

    print("\nChecking Assignments...")
    asgs = Assignment.query.all()
    for a in asgs:
        print(f"Asg ID: {a.id}, Title: {a.title}, Status: {a.status}")
