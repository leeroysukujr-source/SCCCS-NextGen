import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app, db
from app.models import User, Workspace
from app.utils.audit import log_audit_event

app = create_app()
with app.app_context():
    # 1. Ensure we have a workspace and an admin
    ws = Workspace.query.first()
    if not ws:
        ws = Workspace(name="Test Workspace", slug="test-ws")
        db.session.add(ws)
        db.session.commit()
    
    admin = User.query.filter_by(role='admin', workspace_id=ws.id).first()
    if not admin:
        admin = User(username="testadmin", email="admin@test.com", role='admin', workspace_id=ws.id)
        admin.set_password("password123")
        db.session.add(admin)
        db.session.commit()
        
    # 2. Create a dummy teacher to delete
    teacher = User(username="testteacher", email="teacher@test.com", role='teacher', workspace_id=ws.id)
    db.session.add(teacher)
    db.session.commit()
    teacher_id = teacher.id
    teacher_email = teacher.email
    
    print(f"Created dummy teacher with ID {teacher_id}")
    
    # 3. Simulate deletion (as if called by the route)
    # This is what our new route does:
    user_to_delete = User.query.get(teacher_id)
    deleted_info = {
        'username': user_to_delete.username,
        'email': user_to_delete.email,
        'role': user_to_delete.role,
        'workspace_id': user_to_delete.workspace_id
    }
    
    db.session.delete(user_to_delete)
    db.session.commit()
    
    # Log audit event (manually simulating the route's call to the utility)
    log_audit_event(
        user_id=admin.id,
        action='delete_user',
        resource_type='user',
        resource_id=teacher_id,
        details=deleted_info
    )
    
    print(f"Deleted user and logged event as admin {admin.id}")
    
    # 4. Verify the log entry
    from app.models.security import AuditLog
    last_log = AuditLog.query.order_by(AuditLog.created_at.desc()).first()
    if last_log and last_log.action == 'delete_user':
        print(f"SUCCESS: Audit log entry found! ID: {last_log.id}, Action: {last_log.action}, Details: {last_log.details_data}")
    else:
        print("FAILURE: Audit log entry not found or incorrect.")
