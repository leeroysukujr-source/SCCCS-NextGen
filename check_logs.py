import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app, db
from app.models.security import AuditLog

app = create_app()
with app.app_context():
    print("Checking last 5 AuditLogs:")
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(5).all()
    if not logs:
        print("No logs found.")
    for log in logs:
        print(f"ID: {log.id}, Action: {log.action}, Resource: {log.resource_type}/{log.resource_id}, Details: {log.details_data}")
