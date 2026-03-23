"""
Real-time Collaboration Features
"""
from datetime import datetime
from app import db
import json

class Presence(db.Model):
    """User presence tracking"""
    __tablename__ = 'presence'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    status = db.Column(db.String(20), default='offline')  # online, away, busy, offline
    current_resource_type = db.Column(db.String(50))  # channel, class, lesson
    current_resource_id = db.Column(db.Integer)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('presence', uselist=False, cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'status': self.status,
            'current_resource_type': self.current_resource_type,
            'current_resource_id': self.current_resource_id,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
        }

class FileVersion(db.Model):
    """File version control"""
    __tablename__ = 'file_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=False, index=True)
    version_number = db.Column(db.Integer, nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    change_description = db.Column(db.Text)
    checksum = db.Column(db.String(64))  # SHA-256 hash
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    file = db.relationship('File', backref='versions')
    uploader = db.relationship('User', foreign_keys=[uploaded_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_id': self.file_id,
            'version_number': self.version_number,
            'file_size': self.file_size,
            'uploaded_by': self.uploaded_by,
            'change_description': self.change_description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class CollaborationSession(db.Model):
    """Track active collaboration sessions"""
    __tablename__ = 'collaboration_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    resource_type = db.Column(db.String(50), nullable=False)  # document, file, lesson
    resource_id = db.Column(db.Integer, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    cursor_position = db.Column(db.Text)  # JSON string for cursor/selection data
    is_active = db.Column(db.Boolean, default=True)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='collaboration_sessions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'user_id': self.user_id,
            'cursor_position': json.loads(self.cursor_position) if self.cursor_position else {},
            'is_active': self.is_active,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
        }

