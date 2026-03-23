"""
Advanced Notification System
"""
from datetime import datetime
from app import db
import json

class NotificationPreference(db.Model):
    """User notification preferences"""
    __tablename__ = 'notification_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    email_enabled = db.Column(db.Boolean, default=True)
    push_enabled = db.Column(db.Boolean, default=True)
    in_app_enabled = db.Column(db.Boolean, default=True)
    notification_types = db.Column(db.Text)  # JSON object with per-type preferences
    quiet_hours_start = db.Column(db.Time)
    quiet_hours_end = db.Column(db.Time)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('notification_preference', uselist=False, cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'email_enabled': self.email_enabled,
            'push_enabled': self.push_enabled,
            'in_app_enabled': self.in_app_enabled,
            'notification_types': json.loads(self.notification_types) if self.notification_types else {},
            'quiet_hours_start': self.quiet_hours_start.isoformat() if self.quiet_hours_start else None,
            'quiet_hours_end': self.quiet_hours_end.isoformat() if self.quiet_hours_end else None,
        }

class Notification(db.Model):
    """Enhanced notification model"""
    __tablename__ = 'notifications_v2'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    notification_type = db.Column(db.String(50), nullable=False, index=True)  # message, mention, assignment, etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    resource_type = db.Column(db.String(50))  # channel, class, lesson, file
    resource_id = db.Column(db.Integer)
    action_url = db.Column(db.String(500))
    is_read = db.Column(db.Boolean, default=False, index=True)
    is_sent_email = db.Column(db.Boolean, default=False)
    is_sent_push = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    meta_data = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    read_at = db.Column(db.DateTime)
    
    user = db.relationship('User', backref=db.backref('notifications_v2', cascade='all, delete-orphan'))
    
    def mark_as_read(self):
        self.is_read = True
        self.read_at = datetime.utcnow()
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'notification_type': self.notification_type,
            'title': self.title,
            'message': self.message,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'action_url': self.action_url,
            'is_read': self.is_read,
            'priority': self.priority,
            'metadata': json.loads(self.meta_data) if self.meta_data else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
        }

