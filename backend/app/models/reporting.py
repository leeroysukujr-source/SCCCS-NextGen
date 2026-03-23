from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB

class ReportRequest(db.Model):
    __tablename__ = 'report_requests'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    status = db.Column(db.String(50), default='pending')  # pending, submitted, overdue
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # If null, it's a system-wide request for all workspaces
    # If set, it's for a specific workspace
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)

    submissions = db.relationship('ReportSubmission', backref='request', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'workspace_id': self.workspace_id
        }

class ReportSubmission(db.Model):
    __tablename__ = 'report_submissions'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('report_requests.id'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    submitted_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Snapshot of the analytics data at time of submission
    data = db.Column(db.JSON) 
    notes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'workspace_id': self.workspace_id,
            'submitted_at': self.submitted_at.isoformat(),
            'notes': self.notes,
            # We don't include extensive data in list view, fetch details separately
        }
