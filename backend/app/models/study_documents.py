
from datetime import datetime
from app import db
import json

class StudyRoomDocument(db.Model):
    __tablename__ = 'study_room_documents'

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.String(255), nullable=False, index=True) # Linking to LiveKit room name or internal ID
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), default='Untitled Document')
    content = db.Column(db.Text) # Storing as HTML or JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    collaborators = db.relationship('StudyRoomDocumentCollaborator', backref='document', lazy=True, cascade="all, delete-orphan")
    versions = db.relationship('StudyRoomDocumentVersion', backref='document', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'owner_id': self.owner_id,
            'title': self.title,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class StudyRoomDocumentCollaborator(db.Model):
    __tablename__ = 'study_room_document_collaborators'

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('study_room_documents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(50), default='editor') # owner, editor, viewer
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'Unknown',
            'role': self.role
        }

class StudyRoomDocumentVersion(db.Model):
    __tablename__ = 'study_room_document_versions'

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('study_room_documents.id'), nullable=False)
    content_snapshot = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StudyRoomDocumentComment(db.Model):
    __tablename__ = 'study_room_document_comments'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('study_room_documents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'Unknown',
            'avatar_url': self.user.avatar_url if self.user else None,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }
