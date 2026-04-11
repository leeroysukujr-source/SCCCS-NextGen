from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
from sqlalchemy import event
import json

# User Model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='student', nullable=False)  # admin, teacher, student
    platform_role = db.Column(db.String(20), default='NONE', nullable=False)  # SUPER_ADMIN, NONE
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    avatar_url = db.Column(db.String(500))
    oauth_provider = db.Column(db.String(50))  # google, github, etc.
    oauth_id = db.Column(db.String(255))
    _privileges = db.Column('privileges', db.Text)  # JSON string for privileges
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Two-factor auth fields
    two_factor_enabled = db.Column(db.Boolean, default=False, nullable=False)
    totp_secret = db.Column(db.String(128))
    totp_encrypted = db.Column(db.Boolean, default=False, nullable=False)
    
    # Institutional linkage
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Link to the admin (head of institution)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    last_workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    status = db.Column(db.String(20), default='active', nullable=False) # pending_email, pending_verification, pending_approval, active, rejected, suspended
    
    # Relationships
    created_lessons = db.relationship('Lesson', foreign_keys='Lesson.created_by', backref='creator', lazy='dynamic', cascade='all, delete-orphan')
    created_classes = db.relationship('Class', foreign_keys='Class.teacher_id', backref='teacher', lazy='dynamic', cascade='all, delete-orphan')
    created_channels = db.relationship('Channel', foreign_keys='Channel.created_by', backref='channel_creator', lazy='dynamic', cascade='all, delete-orphan')
    created_rooms = db.relationship('Room', foreign_keys='Room.host_id', backref='host', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    @property
    def privileges(self):
        """Get privileges as dict"""
        if self._privileges:
            try:
                return json.loads(self._privileges)
            except:
                return {}
        return {}
    
    @privileges.setter
    def privileges(self, value):
        """Set privileges from dict"""
        if isinstance(value, dict):
            self._privileges = json.dumps(value) if value else None
        elif isinstance(value, str):
            self._privileges = value
    @property
    def effective_role(self):
        """Get the user's effective role (platform-wide or workspace-specific)"""
        # Super admin has highest priority
        if self.role == 'super_admin' or self.platform_role == 'SUPER_ADMIN':
            return 'super_admin'
            
        # Check if they are the owner of their current workspace
        if self.workspace_id and self.workspace_obj:
            if self.workspace_obj.admin_id == self.id:
                return 'admin'
                
        return self.role

    def to_dict(self):
        effective_role = self.effective_role
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': effective_role,
            'is_active': self.is_active,
            'avatar_url': self.avatar_url,
            'oauth_provider': self.oauth_provider,
            'privileges': self.privileges,
            'workspace_id': self.workspace_id,
            'workspace_name': self.workspace_obj.name if self.workspace_obj else None,
            'workspace_logo': self.workspace_obj.logo_url if self.workspace_obj else None,
            'workspace_code': self.workspace_obj.code if self.workspace_obj else None,
            'workspace_status': self.workspace_obj.status if self.workspace_obj else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    # RBAC Helper
    def has_permission(self, permission_name):
        """Check if user has a specific permission in their current workspace"""
        # Super admin has all permissions
        if self.role == 'super_admin':
            return True
        
        # Check assigned roles
        for role in self.roles:
            # Roles are workspace-scoped. Ensure role matches current workspace (if set)
            if role.workspace_id == self.workspace_id:
                for perm in role.permissions:
                    if perm.name == permission_name:
                        return True
        return False

# Association tables for RBAC
role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True)
)

user_roles = db.Table('user_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True)
)

# Event listener to enforce workspace assignment
@event.listens_for(User, 'before_insert')
def validate_workspace_assignment(mapper, connection, target):
    """Ensure non-superadmin users always have a workspace_id"""
    # Relaxed for global signup flow
    # if target.role != 'super_admin' and target.workspace_id is None:
    #    raise ValueError("Workspace assignment is mandatory for all students and staff.")
    pass

# Workspace Model (Institution/School)
class Workspace(db.Model):
    __tablename__ = 'workspaces'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # The primary admin (head)
    settings = db.Column(db.Text) # JSON string for custom branding/settings
    logo_url = db.Column(db.String(500)) # Path to institution logo
    status = db.Column(db.String(20), default='active', nullable=False) # active, suspended, archived
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', foreign_keys='User.workspace_id', backref='workspace_obj', lazy='dynamic')
    head = db.relationship('User', foreign_keys=[admin_id])
    memberships = db.relationship('WorkspaceMembership', back_populates='workspace', cascade='all, delete-orphan')

    def get_settings(self):
        if not self.settings:
            return {}
        try:
            return json.loads(self.settings)
        except:
            return {}

    def set_settings(self, settings_dict):
        self.settings = json.dumps(settings_dict)

    @property
    def is_active(self):
        return self.status == 'active'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'code': self.code,
            'description': self.description,
            'status': self.status,
            'is_active': self.is_active,
            'admin_id': self.admin_id,
            'admin_name': self.head.username if self.head else None,
            'logo_url': self.logo_url,
            'settings': self.get_settings(),
            'member_count': self.users.count() if hasattr(self, 'users') else 0,
            'admin_count': self.users.filter_by(role='admin').count() if hasattr(self, 'users') else 0,
            'student_count': self.users.filter_by(role='student').count() if hasattr(self, 'users') else 0,
        }

# Workspace Membership Model (Many-to-Many with roles)
class WorkspaceMembership(db.Model):
    __tablename__ = 'workspace_memberships'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    role = db.Column(db.String(20), default='student', nullable=False)  # admin, teacher, student
    status = db.Column(db.String(20), default='active', nullable=False)  # active, suspended, pending
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('memberships', lazy='dynamic', cascade='all, delete-orphan'))
    workspace = db.relationship('Workspace', back_populates='memberships')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'workspace_id': self.workspace_id,
            'workspace_name': self.workspace.name if self.workspace else None,
            'role': self.role,
            'status': self.status,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }

# Multi-tenant Auth Models

class WorkspaceDomain(db.Model):
    __tablename__ = 'workspace_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    domain = db.Column(db.String(255), unique=True, nullable=False)
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    workspace = db.relationship('Workspace', backref=db.backref('domains', lazy='dynamic'))

class StudentProfile(db.Model):
    __tablename__ = 'student_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    reg_no = db.Column(db.String(100))
    department = db.Column(db.String(200))
    program = db.Column(db.String(200))
    level = db.Column(db.String(50))
    verification_status = db.Column(db.String(20), default='pending') # pending, verified, rejected
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('student_profile', uselist=False, cascade='all, delete-orphan'))
    workspace = db.relationship('Workspace', backref=db.backref('student_profiles', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('workspace_id', 'reg_no', name='unique_workspace_regno'),
    )

class Invite(db.Model):
    __tablename__ = 'invites'
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(100), unique=True, nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    role_hint = db.Column(db.String(20), default='student')
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    workspace = db.relationship('Workspace', backref=db.backref('invites', lazy='dynamic'))

class WorkspaceIdentityPolicy(db.Model):
    __tablename__ = 'workspace_identity_policies'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), unique=True, nullable=False)
    require_regno = db.Column(db.Boolean, default=False)
    regno_regex = db.Column(db.Text, nullable=True)
    verification_mode = db.Column(db.String(50), default='ADMIN_APPROVAL') # ADMIN_APPROVAL, REGISTRY_MATCH, EXTERNAL_API
    allow_public_signup = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    workspace = db.relationship('Workspace', backref=db.backref('identity_policy', uselist=False))




# Workspace Settings Model (Key-Value)
class WorkspaceSetting(db.Model):
    __tablename__ = 'workspace_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    key = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text, nullable=True) # JSON value
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationship
    workspace = db.relationship('Workspace', backref=db.backref('settings_kv', lazy='dynamic'))

    def to_dict(self):
        val = self.value
        try:
            val = json.loads(self.value)
        except:
            pass
        return {
            'key': self.key,
            'value': val,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# Feature Flag Models
class GlobalFeatureFlag(db.Model):
    __tablename__ = 'global_feature_flags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True) # e.g., 'channels', 'video_room'
    is_enabled = db.Column(db.Boolean, default=True, nullable=False)
    config = db.Column(db.Text, nullable=True) # Default JSON configuration
    description = db.Column(db.String(255))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'is_enabled': self.is_enabled,
            'config': json.loads(self.config) if self.config else {},
            'description': self.description,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class WorkspaceFeatureOverride(db.Model):
    __tablename__ = 'workspace_feature_overrides'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False, index=True)
    feature_name = db.Column(db.String(100), nullable=False, index=True) # Must match GlobalFeatureFlag.name
    is_enabled = db.Column(db.Boolean, nullable=False)
    config = db.Column(db.Text, nullable=True) # Workspace-specific JSON override
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    workspace = db.relationship('Workspace', backref=db.backref('feature_overrides', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'feature_name': self.feature_name,
            'is_enabled': self.is_enabled,
            'config': json.loads(self.config) if self.config else {},
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# RBAC Models
class Permission(db.Model):
    __tablename__ = 'permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Role(db.Model):
    __tablename__ = 'roles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True) # Global roles if Null
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    permissions = db.relationship('Permission', secondary=role_permissions, lazy='subquery',
        backref=db.backref('roles', lazy=True))
    users = db.relationship('User', secondary=user_roles, lazy='subquery',
        backref=db.backref('roles', lazy=True))
    workspace = db.relationship('Workspace', backref=db.backref('roles', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'workspace_id': self.workspace_id,
            'description': self.description,
            'permissions': [p.name for p in self.permissions]
        }

# Class Model
class Class(db.Model):
    __tablename__ = 'classes'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    members = db.relationship('ClassMember', backref='class_obj', lazy='dynamic', cascade='all, delete-orphan')
    lessons = db.relationship('Lesson', backref='class_obj', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        teacher_info = None
        if self.teacher:
            teacher_info = {
                'id': self.teacher.id,
                'first_name': self.teacher.first_name,
                'last_name': self.teacher.last_name,
                'username': self.teacher.username,
                'full_name': f"{self.teacher.first_name or ''} {self.teacher.last_name or ''}".strip() or self.teacher.username
            }
        
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'code': self.code,
            'teacher_id': self.teacher_id,
            'teacher': teacher_info,
            'workspace_id': self.workspace_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# ClassMember Model
class ClassMember(db.Model):
    __tablename__ = 'class_members'
    
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='student')  # teacher, ta, student
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('class_memberships', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'class_id': self.class_id,
            'user_id': self.user_id,
            'role': self.role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'user': self.user.to_dict() if self.user else None,
        }

# Lesson Model
class Lesson(db.Model):
    __tablename__ = 'lessons'
    
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    content = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    links = db.relationship('LessonLink', backref='lesson', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'class_id': self.class_id,
            'title': self.title,
            'description': self.description,
            'content': self.content,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# LessonLink Model (already exists, keeping it)
class LessonLink(db.Model):
    __tablename__ = 'lesson_links'
    
    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'lesson_id': self.lesson_id,
            'title': self.title,
            'url': self.url,
            'description': self.description,
            'created_by': self.created_by,
            'creator': self.creator.to_dict() if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# Room Model
class Room(db.Model):
    __tablename__ = 'rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    room_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    meeting_type = db.Column(db.String(20), default='instant')  # instant, scheduled
    scheduled_at = db.Column(db.DateTime)
    max_participants = db.Column(db.Integer, default=50)
    duration_minutes = db.Column(db.Integer, default=60)
    is_active = db.Column(db.Boolean, default=True)
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    parent_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)
    is_breakout = db.Column(db.Boolean, default=False)
    breakout_status = db.Column(db.String(20), default='not_started') # not_started, active, closed
    breakout_config = db.Column(db.Text) # JSON for timer, auto-join, etc.
    
    is_locked = db.Column(db.Boolean, default=False)
    
    # Relationships
    participants = db.relationship('RoomParticipant', backref='room', lazy='dynamic', cascade='all, delete-orphan')
    breakout_rooms = db.relationship('Room', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')
    
    def to_dict(self):
        try:
            b_config = json.loads(self.breakout_config) if self.breakout_config else {}
        except:
            b_config = {}
            
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'host_id': self.host_id,
            'room_code': self.room_code,
            'meeting_type': self.meeting_type,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'max_participants': self.max_participants,
            'duration_minutes': getattr(self, 'duration_minutes', 60),
            'is_active': self.is_active,
            'is_locked': self.is_locked or False,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'workspace_id': self.workspace_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_breakout': self.is_breakout or False,
            'parent_id': self.parent_id,
            'breakout_status': self.breakout_status or 'not_started',
            'breakout_config': b_config,
            'breakout_rooms': [r.id for r in self.breakout_rooms.all()] if not self.is_breakout else []
        }

# RoomParticipant Model
class RoomParticipant(db.Model):
    __tablename__ = 'room_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    left_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('room_participations', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'left_at': self.left_at.isoformat() if self.left_at else None,
            'user': self.user.to_dict() if self.user else None,
        }

# Channel Model
class Channel(db.Model):
    __tablename__ = 'channels'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.String(20), default='private')  # public, private, course
    course_code = db.Column(db.String(20))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    is_encrypted = db.Column(db.Boolean, default=True)
    encryption_key = db.Column(db.Text)  # Store encryption key as string
    share_code = db.Column(db.String(100), unique=True, index=True)
    avatar_url = db.Column(db.String(500))  # Channel avatar/icon
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    status = db.Column(db.String(20), default='draft') # published, draft, archived
    
    # Advanced features
    max_members = db.Column(db.Integer)  # Optional member limit
    allow_file_sharing = db.Column(db.Boolean, default=True)
    allow_message_editing = db.Column(db.Boolean, default=True)
    allow_message_deletion = db.Column(db.Boolean, default=True)
    default_message_ttl = db.Column(db.Integer)  # Auto-delete messages after X days
    
    # Relationships
    members = db.relationship('ChannelMember', backref='channel', lazy='dynamic', cascade='all, delete-orphan')
    messages = db.relationship('Message', backref='channel', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'type': self.type,
            'course_code': self.course_code,
            'status': self.status,
            'created_by': self.created_by,
            'is_encrypted': self.is_encrypted,
            'share_code': self.share_code,
            'avatar_url': self.avatar_url,
            'max_members': self.max_members,
            'allow_file_sharing': self.allow_file_sharing if hasattr(self, 'allow_file_sharing') else True,
            'allow_message_editing': self.allow_message_editing if hasattr(self, 'allow_message_editing') else True,
            'allow_message_deletion': self.allow_message_deletion if hasattr(self, 'allow_message_deletion') else True,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'workspace_id': self.workspace_id,
            'member_count': self.members.count() if hasattr(self, 'members') else 0,
            'message_count': self.messages.count() if hasattr(self, 'messages') else 0,
        }

# ChannelMember Model
class ChannelMember(db.Model):
    __tablename__ = 'channel_members'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='member')  # admin, co-admin, moderator, member
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_read_at = db.Column(db.DateTime)  # Last time user read messages in this channel
    is_muted = db.Column(db.Boolean, default=False)
    notification_settings = db.Column(db.Text)  # JSON string for notification preferences
    
    # Relationships
    user = db.relationship('User', backref=db.backref('channel_memberships', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'user_id': self.user_id,
            'role': self.role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'last_read_at': self.last_read_at.isoformat() if self.last_read_at else None,
            'is_muted': self.is_muted,
            'notification_settings': json.loads(self.notification_settings) if self.notification_settings else {},
            'user': self.user.to_dict() if self.user else None,
        }


# ChannelInvite Model - allows expiring, revocable invites with optional email target
class ChannelInvite(db.Model):
    __tablename__ = 'channel_invites'

    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    email = db.Column(db.String(255))  # Optional target email for the invite
    max_uses = db.Column(db.Integer)  # Optional maximum uses
    uses = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime)
    revoked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', foreign_keys=[created_by])

    def is_valid(self):
        if self.revoked:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        if self.max_uses is not None and self.uses >= self.max_uses:
            return False
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'token': self.token,
            'created_by': self.created_by,
            'email': self.email,
            'max_uses': self.max_uses,
            'uses': self.uses,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'revoked': self.revoked,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# InviteAudit - simple audit log for invite operations
class InviteAudit(db.Model):
    __tablename__ = 'invite_audits'

    id = db.Column(db.Integer, primary_key=True)
    invite_id = db.Column(db.Integer, db.ForeignKey('channel_invites.id'), nullable=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)  # created, revoked, used, regenerated
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    target_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    ip_address = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'invite_id': self.invite_id,
            'channel_id': self.channel_id,
            'action': self.action,
            'actor_id': self.actor_id,
            'target_user_id': self.target_user_id,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# Two-factor audit log
class TwoFactorAudit(db.Model):
    __tablename__ = 'twofactor_audits'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    action = db.Column(db.String(50), nullable=False)  # setup_attempt, verify_attempt, disable_attempt
    success = db.Column(db.Boolean, default=False)
    ip_address = db.Column(db.String(100))
    user_agent = db.Column(db.String(500))
    details = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'success': bool(self.success),
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# Message Model
class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')  # text, file, image, audio, video, poll, etc.
    thread_id = db.Column(db.Integer, db.ForeignKey('messages.id'))  # For threaded messages
    reply_to_id = db.Column(db.Integer, db.ForeignKey('messages.id'))  # Direct reply to a message
    mentions = db.Column(db.Text)  # JSON array of user IDs
    is_encrypted = db.Column(db.Boolean, default=False)
    is_edited = db.Column(db.Boolean, default=False)
    is_pinned = db.Column(db.Boolean, default=False)
    is_forwarded = db.Column(db.Boolean, default=False)
    original_message_id = db.Column(db.Integer, db.ForeignKey('messages.id'))  # If forwarded
    forward_count = db.Column(db.Integer, default=0)  # How many times this message was forwarded
    reaction_count = db.Column(db.Integer, default=0)  # Cache of reaction count
    reply_count = db.Column(db.Integer, default=0)  # Cache of reply count
    view_count = db.Column(db.Integer, default=0)  # How many users viewed this
    expires_at = db.Column(db.DateTime)  # Auto-delete at this time
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    author = db.relationship('User', backref=db.backref('messages', cascade='all, delete-orphan'))
    thread = db.relationship('Message', remote_side=[id], foreign_keys=[thread_id], backref='thread_replies')
    reply_to = db.relationship('Message', remote_side=[id], foreign_keys=[reply_to_id], backref='direct_replies')
    original_message = db.relationship('Message', remote_side=[id], foreign_keys=[original_message_id], backref='forwards')
    files = db.relationship('File', backref='message', lazy='dynamic')
    
    def get_mentions(self):
        """Get mentions as list"""
        if self.mentions:
            try:
                return json.loads(self.mentions)
            except:
                return []
        return []
    
    def set_mentions(self, mentions_list):
        """Set mentions from list"""
        self.mentions = json.dumps(mentions_list) if mentions_list else None
    
    def to_dict(self, include_reactions=True, include_read_receipts=False, current_user_id=None):
        """Convert message to dict with optional advanced features"""
        result = {
            'id': self.id,
            'channel_id': self.channel_id,
            'author_id': self.author_id,
            'author': self.author.to_dict() if self.author else None,
            'content': self.content,
            'message_type': self.message_type,
            'thread_id': self.thread_id,
            'reply_to_id': self.reply_to_id,
            'mentions': self.get_mentions(),
            'is_encrypted': self.is_encrypted,
            'is_edited': self.is_edited,
            'is_pinned': self.is_pinned,
            'is_forwarded': self.is_forwarded,
            'original_message_id': self.original_message_id,
            'forward_count': self.forward_count or 0,
            'reaction_count': self.reaction_count or 0,
            'reply_count': self.reply_count or 0,
            'view_count': self.view_count or 0,
            'expires_at': (self.expires_at.isoformat() + 'Z') if self.expires_at else None,
            'created_at': (self.created_at.isoformat() + 'Z') if self.created_at else None,
            'updated_at': (self.updated_at.isoformat() + 'Z') if self.updated_at else None,
            'attachments': [f.to_dict() for f in self.files.all()] if hasattr(self, 'files') else []
        }
        
        # Include reactions if requested
        if include_reactions and hasattr(self, 'reactions'):
            from collections import defaultdict
            reaction_groups = defaultdict(list)
            for reaction in self.reactions:
                reaction_groups[reaction.emoji].append(reaction.user.to_dict() if reaction.user else None)
            result['reactions'] = {emoji: users for emoji, users in reaction_groups.items()}
        
        # Include read receipts if requested and user has permission
        if include_read_receipts and hasattr(self, 'read_receipts') and current_user_id:
            # Only show read receipts if user is the author or channel admin
            channel = self.channel if hasattr(self, 'channel') else None
            if channel:
                member = None
                if hasattr(channel, 'members'):
                    member = channel.members.filter_by(user_id=current_user_id).first()
                if self.author_id == current_user_id or (member and member.role in ['admin', 'co-admin']):
                    result['read_receipts'] = [rr.to_dict() for rr in self.read_receipts]
        
        # Include reply preview if this is a reply
        if self.reply_to_id and hasattr(self, 'reply_to') and self.reply_to:
            result['reply_to_preview'] = {
                'id': self.reply_to.id,
                'content': self.reply_to.content[:100] + '...' if len(self.reply_to.content) > 100 else self.reply_to.content,
                'author': self.reply_to.author.to_dict() if self.reply_to.author else None,
            }
        
        return result

# Notification Model
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # message, mention, etc.
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text)
    related_id = db.Column(db.Integer)  # ID of related entity (message, etc.)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('notifications_legacy', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'content': self.content,
            'related_id': self.related_id,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# File Model
class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)  # Size in bytes
    mime_type = db.Column(db.String(100))
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'))
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'))
    group_id = db.Column(db.Integer, db.ForeignKey('assignment_groups.id'))
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'))
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    uploader = db.relationship('User', backref=db.backref('uploaded_files', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'uploaded_by': self.uploaded_by,
            'message_id': self.message_id,
            'lesson_id': self.lesson_id,
            'group_id': self.group_id,
            'assignment_id': self.assignment_id,
            'workspace_id': self.workspace_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# Group Model
class Group(db.Model):
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), default='students')  # students, teachers, etc.
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    join_type = db.Column(db.String(20), default='request')  # direct, request, link
    join_code = db.Column(db.String(20), unique=True, index=True)
    max_members = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    members = db.relationship('GroupMember', backref='group', lazy='dynamic', cascade='all, delete-orphan')
    join_requests = db.relationship('GroupJoinRequest', backref='group', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'created_by': self.created_by,
            'join_type': self.join_type,
            'join_code': self.join_code,
            'max_members': self.max_members,
            'is_active': self.is_active,
            'workspace_id': self.workspace_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# GroupMember Model
class GroupMember(db.Model):
    __tablename__ = 'group_members'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='member')  # admin, member
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('group_memberships', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'role': self.role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'user': self.user.to_dict() if self.user else None,
        }

# GroupJoinRequest Model
class GroupJoinRequest(db.Model):
    __tablename__ = 'group_join_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='group_join_requests')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewed_by': self.reviewed_by,
        }

# DirectMessage Model (for one-on-one messaging)
class DirectMessage(db.Model):
    __tablename__ = 'direct_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')  # text, file, image, call_started, call_ended, call_missed
    thread_id = db.Column(db.Integer, db.ForeignKey('direct_messages.id'))  # For threaded messages
    is_encrypted = db.Column(db.Boolean, default=True)
    # Call-specific fields
    call_room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)
    call_duration = db.Column(db.Integer, nullable=True)  # Duration in seconds
    call_status = db.Column(db.String(20), nullable=True)  # started, ended, missed, answered
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_direct_messages', cascade='all, delete-orphan', passive_deletes=True))
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref=db.backref('received_direct_messages', cascade='all, delete-orphan', passive_deletes=True))
    thread = db.relationship('DirectMessage', remote_side=[id], backref='replies')
    files = db.relationship('DirectMessageFile', backref='direct_message', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        result = {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender': self.sender.to_dict() if self.sender else None,
            'recipient_id': self.recipient_id,
            'recipient': self.recipient.to_dict() if self.recipient else None,
            'content': self.content,
            'message_type': self.message_type,
            'thread_id': self.thread_id,
            'is_encrypted': self.is_encrypted,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'attachments': [f.file.to_dict() for f in self.files.all()] if self.files else []
        }
        # Add call fields only if they exist (for backward compatibility)
        if hasattr(self, 'call_room_id'):
            result['call_room_id'] = self.call_room_id
        if hasattr(self, 'call_duration'):
            result['call_duration'] = self.call_duration
        if hasattr(self, 'call_status'):
            result['call_status'] = self.call_status
        return result

# DirectMessageFile Model (for files in direct messages)
class DirectMessageFile(db.Model):
    __tablename__ = 'direct_message_files'
    
    id = db.Column(db.Integer, primary_key=True)
    direct_message_id = db.Column(db.Integer, db.ForeignKey('direct_messages.id'), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    file = db.relationship('File', backref=db.backref('direct_message_attachments', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'direct_message_id': self.direct_message_id,
            'file': self.file.to_dict() if self.file else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# Feedback Model (for students to send feedback/grievances to lecturers)
class Feedback(db.Model):
    __tablename__ = 'feedbacks'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    lecturer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), default='general')  # general, academic, grievance, suggestion, complaint
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    status = db.Column(db.String(20), default='pending')  # pending, acknowledged, resolved, closed
    is_anonymous = db.Column(db.Boolean, default=False)
    response = db.Column(db.Text)  # Lecturer's response
    responded_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], backref=db.backref('sent_feedbacks', cascade='all, delete-orphan', passive_deletes=True))
    lecturer = db.relationship('User', foreign_keys=[lecturer_id], backref=db.backref('received_feedbacks', cascade='all, delete-orphan', passive_deletes=True))
    
    def to_dict(self):
        # For anonymous feedback, hide student identity
        student_data = None
        if not self.is_anonymous:
            student_data = self.student.to_dict() if self.student else None
        
        return {
            'id': self.id,
            'student_id': self.student_id if not self.is_anonymous else None,
            'student': student_data,
            'lecturer_id': self.lecturer_id,
            'lecturer': self.lecturer.to_dict() if self.lecturer else None,
            'subject': self.subject,
            'content': self.content,
            'category': self.category,
            'priority': self.priority,
            'status': self.status,
            'is_anonymous': self.is_anonymous,
            'response': self.response,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

# Password Reset Token Model
class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('password_reset_tokens', lazy='dynamic', cascade='all, delete-orphan'))

    def is_expired(self):
        return datetime.utcnow() > self.expires_at


# GPARecord - store per-user GPA calculator data as JSON
class GPARecord(db.Model):
    __tablename__ = 'gpa_records'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    data = db.Column(db.Text)  # JSON string containing { courses: [...], scaleKey: '4.0' }
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('gpa_records', cascade='all, delete-orphan'))

    def to_dict(self):
        try:
            payload = json.loads(self.data) if self.data else {}
        except Exception:
            payload = {}
        return {
            'id': self.id,
            'user_id': self.user_id,
            'data': payload,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# DeviceSession model for session management and token revocation
class DeviceSession(db.Model):
    __tablename__ = 'device_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    token_jti = db.Column(db.String(128), index=True)
    device_info = db.Column(db.String(500))
    ip_address = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    revoked = db.Column(db.Boolean, default=False)

    user = db.relationship('User', backref=db.backref('device_sessions', cascade='all, delete-orphan', passive_deletes=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'token_jti': self.token_jti,
            'device_info': self.device_info,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'revoked': bool(self.revoked)
        }
# GroupMessage Model (for study group messaging)
class GroupMessage(db.Model):
    __tablename__ = 'group_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')  # text, file, system
    file_id = db.Column(db.Integer, db.ForeignKey('files.id')) # Optional
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('group_messages', cascade='all, delete-orphan'))
    group = db.relationship('Group', backref='messages')
    file = db.relationship('File')

    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'content': self.content,
            'message_type': self.message_type,
            'file': self.file.to_dict() if self.file else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# Tutor Profile Model
class TutorProfile(db.Model):
    __tablename__ = 'tutor_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    bio = db.Column(db.Text)
    subjects = db.Column(db.Text)  # Comma-separated or JSON
    hourly_rate = db.Column(db.Float, default=0.0)
    availability = db.Column(db.Text) # JSON string preferred
    rating = db.Column(db.Float, default=0.0)
    review_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('tutor_profile', uselist=False, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'bio': self.bio,
            'subjects': self.subjects.split(',') if self.subjects else [],
            'hourly_rate': self.hourly_rate,
            'availability': json.loads(self.availability) if self.availability else {},
            'rating': self.rating,
            'review_count': self.review_count,
            'created_at': self.created_at.isoformat()
        }

# Tutor Session Model
class TutorSession(db.Model):
    __tablename__ = 'tutor_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    tutor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    scheduled_at = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pending') # pending, confirmed, completed, cancelled
    meeting_link = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    tutor = db.relationship('User', foreign_keys=[tutor_id], backref='tutoring_sessions')
    student = db.relationship('User', foreign_keys=[student_id], backref='learning_sessions')

    def to_dict(self):
        tutor_name = 'Unknown'
        if self.tutor:
            tutor_name = f"{self.tutor.first_name or ''} {self.tutor.last_name or ''}".strip() or self.tutor.username

        student_name = 'Unknown'
        if self.student:
            student_name = f"{self.student.first_name or ''} {self.student.last_name or ''}".strip() or self.student.username

        return {
            'id': self.id,
            'tutor_id': self.tutor_id,
            'tutor_name': tutor_name,
            'student_id': self.student_id,
            'student_name': student_name,
            'subject': self.subject,
            'scheduled_at': self.scheduled_at.isoformat(),
            'status': self.status,
            'meeting_link': self.meeting_link,
            'created_at': self.created_at.isoformat()
        }


# Announcement Model (Workspace Scoped)
class Announcement(db.Model):
    __tablename__ = 'announcements'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='normal') # normal, high, urgent
    is_active = db.Column(db.Boolean, default=True)
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    workspace = db.relationship('Workspace', backref='announcements')
    author = db.relationship('User', foreign_keys=[author_id], backref=db.backref('announcements', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'author_name': self.author.username if self.author else 'Unknown',
            'title': self.title,
            'content': self.content,
            'priority': self.priority,
            'created_at': self.created_at.isoformat()
        }

# -------------------------------------------------------------------
# GROUP STUDY ROOM (GSR) MODELS - Phase 1
# -------------------------------------------------------------------

class Assignment(db.Model):
    __tablename__ = 'assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    due_date = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='draft', nullable=False) # draft, published
    
    # JSON settings: 
    # { 
    #   "group_size": 4, 
    #   "enable_video": true, 
    #   "enable_whiteboard": true,
    #   "allow_student_rooms": true,
    #   "group_creation_mode": "manual" | "random" | "self_select"
    # }
    settings = db.Column(db.Text) 
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    workspace = db.relationship('Workspace', backref='assignments')
    creator = db.relationship('User', foreign_keys=[created_by], backref=db.backref('assignments_created', cascade='all, delete-orphan'))
    groups = db.relationship('AssignmentGroup', backref='assignment', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        settings_dict = {}
        if self.settings:
            try: settings_dict = json.loads(self.settings)
            except: pass
            
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'workspace_id': self.workspace_id,
            'channel_id': self.channel_id,
            'status': self.status,
            'created_by': self.created_by,
            'creator_name': self.creator.username if self.creator else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'settings': settings_dict,
            'created_at': self.created_at.isoformat()
        }

class AssignmentGroup(db.Model):
    __tablename__ = 'assignment_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=False)
    
    # Room Controls
    is_locked = db.Column(db.Boolean, default=False)
    max_members = db.Column(db.Integer, default=5)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    members = db.relationship('AssignmentGroupMember', backref='group', lazy='dynamic', cascade='all, delete-orphan')
    whiteboards = db.relationship('GroupWhiteboard', backref='group', lazy='dynamic', cascade='all, delete-orphan')
    tasks = db.relationship('GroupTask', backref='group', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        members_data = []
        for m in self.members:
            if m.user:
                members_data.append({
                    'id': m.user.id,
                    'username': m.user.username,
                    'avatar': m.user.avatar_url
                })
        return {
            'id': self.id,
            'name': self.name,
            'assignment_id': self.assignment_id,
            'workspace_id': self.workspace_id,
            'is_locked': self.is_locked,
            'max_members': self.max_members,
            'created_at': self.created_at.isoformat(),
            'member_count': len(members_data),
            'members': members_data
        }

class AssignmentGroupMember(db.Model):
    __tablename__ = 'assignment_group_members'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('assignment_groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Roles: Leader, Researcher, Writer, Editor, Presenter, Member
    role = db.Column(db.String(50), default='Member') 
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('assignment_group_memberships', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'role': self.role,
            'user': self.user.to_dict() if self.user else None,
            'joined_at': self.joined_at.isoformat()
        }

class GroupWhiteboard(db.Model):
    __tablename__ = 'group_whiteboards'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('assignment_groups.id'), nullable=False)
    data = db.Column(db.Text) # JSON canvas data
    
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'data': json.loads(self.data) if self.data else None,
            'last_updated': self.last_updated.isoformat()
        }

class GroupTask(db.Model):
    __tablename__ = 'group_tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('assignment_groups.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(50), default='To Do') # To Do, Doing, Done
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    due_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    assigned_user = db.relationship('User', foreign_keys=[assigned_to])
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'assigned_to': self.assigned_to,
            'assigned_user_name': self.assigned_user.username if self.assigned_user else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat()
        }

class AssignmentGroupMessage(db.Model):
    __tablename__ = 'assignment_group_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('assignment_groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(50), default='text') # text, file, system
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('assignment_group_messages', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'content': self.content,
            'message_type': self.message_type,
            'created_at': self.created_at.isoformat()
        }


