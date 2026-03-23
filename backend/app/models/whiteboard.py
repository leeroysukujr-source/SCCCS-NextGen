from datetime import datetime
from app import db

class Whiteboard(db.Model):
    __tablename__ = 'whiteboards'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), default='Untitled Whiteboard')
    data = db.Column(db.Text)  # JSON string storing tldraw snapshot
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # For Study Hub / Creation Hub integration
    # Can be linked to a specific context (like a class or study group) if needed later
    # context_type = db.Column(db.String(50)) # 'class', 'group', 'personal'
    # context_id = db.Column(db.Integer)

    owner = db.relationship('User', backref='whiteboards')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'owner_id': self.owner_id,
            'workspace_id': self.workspace_id,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            # 'data' is loaded separately to avoid payload overhead in lists
        }
