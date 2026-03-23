"""
Integration and Webhook Models
"""
from datetime import datetime
from app import db
import secrets
import json

class Webhook(db.Model):
    """Webhook configuration for integrations"""
    __tablename__ = 'webhooks'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    secret = db.Column(db.String(255), nullable=False)  # For signature verification
    events = db.Column(db.Text)  # JSON array of event types to listen for
    is_active = db.Column(db.Boolean, default=True)
    retry_count = db.Column(db.Integer, default=3)
    timeout_seconds = db.Column(db.Integer, default=30)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref='webhooks')
    
    @staticmethod
    def generate_secret():
        return secrets.token_urlsafe(32)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'url': self.url,
            'events': json.loads(self.events) if self.events else [],
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class WebhookDelivery(db.Model):
    """Track webhook delivery attempts"""
    __tablename__ = 'webhook_deliveries'
    
    id = db.Column(db.Integer, primary_key=True)
    webhook_id = db.Column(db.Integer, db.ForeignKey('webhooks.id'), nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False)
    payload = db.Column(db.Text, nullable=False)  # JSON string
    status = db.Column(db.String(20), default='pending')  # pending, success, failed
    status_code = db.Column(db.Integer)
    response_body = db.Column(db.Text)
    attempt_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    delivered_at = db.Column(db.DateTime)
    
    webhook = db.relationship('Webhook', backref='deliveries')
    
    def to_dict(self):
        return {
            'id': self.id,
            'webhook_id': self.webhook_id,
            'event_type': self.event_type,
            'status': self.status,
            'status_code': self.status_code,
            'attempt_count': self.attempt_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
        }

class APIToken(db.Model):
    """API tokens for third-party integrations"""
    __tablename__ = 'api_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    scopes = db.Column(db.Text)  # JSON array of permission scopes
    last_used_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='api_tokens')
    
    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(32)
    
    def is_expired(self):
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'scopes': json.loads(self.scopes) if self.scopes else [],
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

