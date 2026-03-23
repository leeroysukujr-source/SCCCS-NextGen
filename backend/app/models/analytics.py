"""
Advanced Analytics Models for Enterprise Features
"""
from datetime import datetime
from app import db
import json

class UserActivity(db.Model):
    """Track user activities for analytics"""
    __tablename__ = 'user_activities'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    activity_type = db.Column(db.String(50), nullable=False, index=True)  # login, message_sent, file_uploaded, etc.
    resource_type = db.Column(db.String(50))  # channel, class, lesson, file
    resource_id = db.Column(db.Integer)
    meta_data = db.Column(db.Text)  # JSON string for additional data
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    user = db.relationship('User', backref='activities')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'activity_type': self.activity_type,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'metadata': json.loads(self.meta_data) if self.meta_data else {},
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class SystemMetrics(db.Model):
    """System performance and health metrics"""
    __tablename__ = 'system_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    metric_type = db.Column(db.String(50), nullable=False, index=True)  # cpu, memory, active_users, etc.
    metric_value = db.Column(db.Float, nullable=False)
    meta_data = db.Column(db.Text)  # JSON string
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'metric_type': self.metric_type,
            'metric_value': self.metric_value,
            'metadata': json.loads(self.meta_data) if self.meta_data else {},
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None,
        }

class EngagementMetrics(db.Model):
    """Track user engagement metrics"""
    __tablename__ = 'engagement_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    messages_sent = db.Column(db.Integer, default=0)
    files_uploaded = db.Column(db.Integer, default=0)
    classes_joined = db.Column(db.Integer, default=0)
    lessons_completed = db.Column(db.Integer, default=0)
    time_spent_minutes = db.Column(db.Integer, default=0)
    login_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref='engagement_metrics')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.isoformat() if self.date else None,
            'messages_sent': self.messages_sent,
            'files_uploaded': self.files_uploaded,
            'classes_joined': self.classes_joined,
            'lessons_completed': self.lessons_completed,
            'time_spent_minutes': self.time_spent_minutes,
            'login_count': self.login_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

