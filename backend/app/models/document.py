from datetime import datetime
from app import db

class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), default='Untitled Document')
    content = db.Column(db.Text)  # HTML or JSON content (Tiptap / Markdown)
    doc_type = db.Column(db.String(50), default='smart_doc')  # 'smart_doc', 'data_sheet', 'presentation', 'rubric', 'assignment', 'whiteboard'
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    visibility = db.Column(db.String(50), default='private')  # 'private', 'workspace', 'public'
    status = db.Column(db.String(20), default='active') 
    group_id = db.Column(db.Integer, db.ForeignKey('assignment_groups.id'), nullable=True)
    is_starred = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = db.relationship('User', backref='documents')
    permissions = db.relationship('DocumentPermission', backref='document', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'doc_type': self.doc_type,
            'owner_id': self.owner_id,
            'workspace_id': self.workspace_id,
            'visibility': self.visibility,
            'status': self.status,
            'group_id': self.group_id,
            'is_starred': self.is_starred,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DocumentPermission(db.Model):
    __tablename__ = 'document_permissions'

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) 
    access_level = db.Column(db.String(50), default='view')  # 'view', 'comment', 'edit', 'manage'
    email = db.Column(db.String(255), nullable=True)

    user = db.relationship('User', backref='doc_permissions')

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'access_level': self.access_level,
            'email': self.email,
            'username': self.user.username if self.user else None
        }

class DocumentVersion(db.Model):
    __tablename__ = 'document_versions'

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    label = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    document = db.relationship('Document', backref=db.backref('versions', lazy=True, cascade="all, delete-orphan"))
    creator = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'version_number': self.version_number,
            'label': self.label,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'content': self.content
        }
