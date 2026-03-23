"""
Advanced chat features models
"""
from datetime import datetime
from app import db
import json

class MessageReaction(db.Model):
    """Message reactions (emoji reactions)"""
    __tablename__ = 'message_reactions'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    emoji = db.Column(db.String(50), nullable=False)  # e.g., '👍', '❤️', '😀'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    message = db.relationship('Message', backref='reactions')
    user = db.relationship('User', backref='message_reactions')
    
    # Unique constraint: one emoji per user per message
    __table_args__ = (db.UniqueConstraint('message_id', 'user_id', 'emoji', name='unique_user_emoji_message'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'emoji': self.emoji,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class MessageReadReceipt(db.Model):
    """Read receipts for messages"""
    __tablename__ = 'message_read_receipts'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    read_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    message = db.relationship('Message', backref='read_receipts')
    user = db.relationship('User', backref='message_read_receipts')
    
    # Unique constraint: one read receipt per user per message
    __table_args__ = (db.UniqueConstraint('message_id', 'user_id', name='unique_user_message_read'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'user_id': self.user_id,
            'read_at': self.read_at.isoformat() if self.read_at else None,
        }

class MessageDelivery(db.Model):
    """Message delivery acknowledgements (best-effort delivery tracking)"""
    __tablename__ = 'message_deliveries'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    delivered_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    message = db.relationship('Message', backref='deliveries')
    user = db.relationship('User', backref='message_deliveries')

    __table_args__ = (db.UniqueConstraint('message_id', 'user_id', name='unique_message_delivery'),)

    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'user_id': self.user_id,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
        }

class PinnedMessage(db.Model):
    """Pinned messages in channels"""
    __tablename__ = 'pinned_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    pinned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    pinned_at = db.Column(db.DateTime, default=datetime.utcnow)
    note = db.Column(db.String(500))  # Optional note about why it's pinned
    
    # Relationships
    channel = db.relationship('Channel', backref='pinned_messages')
    message = db.relationship('Message', backref='pins')
    pinner = db.relationship('User', foreign_keys=[pinned_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'message_id': self.message_id,
            'message': self.message.to_dict() if self.message else None,
            'pinned_by': self.pinned_by,
            'pinner': self.pinner.to_dict() if self.pinner else None,
            'pinned_at': self.pinned_at.isoformat() if self.pinned_at else None,
            'note': self.note,
        }

class MessageForward(db.Model):
    """Forwarded messages tracking"""
    __tablename__ = 'message_forwards'
    
    id = db.Column(db.Integer, primary_key=True)
    original_message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    forwarded_message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    forwarded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    forwarded_at = db.Column(db.DateTime, default=datetime.utcnow)
    forwarded_to_channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    
    # Relationships
    original_message = db.relationship('Message', foreign_keys=[original_message_id])
    forwarded_message = db.relationship('Message', foreign_keys=[forwarded_message_id])
    forwarder = db.relationship('User', foreign_keys=[forwarded_by])
    target_channel = db.relationship('Channel', foreign_keys=[forwarded_to_channel_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'original_message_id': self.original_message_id,
            'forwarded_message_id': self.forwarded_message_id,
            'forwarded_by': self.forwarded_by,
            'forwarded_at': self.forwarded_at.isoformat() if self.forwarded_at else None,
            'forwarded_to_channel_id': self.forwarded_to_channel_id,
        }

class MessageEditHistory(db.Model):
    """History of message edits"""
    __tablename__ = 'message_edit_history'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    old_content = db.Column(db.Text)
    edited_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    edited_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    message = db.relationship('Message', backref='edit_history')
    editor = db.relationship('User', foreign_keys=[edited_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'old_content': self.old_content,
            'edited_by': self.edited_by,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
        }

class ChannelPoll(db.Model):
    """Polls in channels"""
    __tablename__ = 'channel_polls'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False, unique=True)
    question = db.Column(db.String(500), nullable=False)
    options = db.Column(db.Text, nullable=False)  # JSON array of options
    is_multiple_choice = db.Column(db.Boolean, default=False)
    is_anonymous = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime)  # Optional expiration
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')  # active, closed, expired
    
    # Relationships
    channel = db.relationship('Channel', backref='polls')
    message = db.relationship('Message', backref='poll')
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def get_options(self):
        """Get options as list"""
        if self.options:
            try:
                return json.loads(self.options)
            except:
                return []
        return []
    
    def set_options(self, options_list):
        """Set options from list"""
        self.options = json.dumps(options_list) if options_list else '[]'
    
    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'message_id': self.message_id,
            'question': self.question,
            'options': self.get_options(),
            'is_multiple_choice': self.is_multiple_choice,
            'is_anonymous': self.is_anonymous,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'status': self.status,
        }

class PollVote(db.Model):
    """Votes on polls"""
    __tablename__ = 'poll_votes'
    
    id = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey('channel_polls.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    option_index = db.Column(db.Integer, nullable=False)  # Index of the selected option
    voted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    poll = db.relationship('ChannelPoll', backref='votes')
    user = db.relationship('User', backref='poll_votes')
    
    # Unique constraint: one vote per user per poll (unless multiple choice)
    __table_args__ = (db.UniqueConstraint('poll_id', 'user_id', 'option_index', name='unique_user_option_vote'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'poll_id': self.poll_id,
            'user_id': self.user_id,
            'option_index': self.option_index,
            'voted_at': self.voted_at.isoformat() if self.voted_at else None,
        }

class ChannelTopic(db.Model):
    """Topics for organizing messages in channels"""
    __tablename__ = 'channel_topics'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50))  # Emoji or icon identifier
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_archived = db.Column(db.Boolean, default=False)
    
    # Relationships
    channel = db.relationship('Channel', backref='topics')
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_archived': self.is_archived,
        }

class ScheduledMessage(db.Model):
    """Scheduled messages to be sent later"""
    __tablename__ = 'scheduled_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')
    scheduled_for = db.Column(db.DateTime, nullable=False)
    sent_at = db.Column(db.DateTime)  # When it was actually sent
    status = db.Column(db.String(20), default='scheduled')  # scheduled, sending, sent, cancelled, failed
    # Optional: store file IDs (JSON array) for attachments
    file_ids = db.Column(db.Text)  # JSON string of file id list
    attempts = db.Column(db.Integer, default=0)
    last_error = db.Column(db.Text)
    retry_interval_seconds = db.Column(db.Integer, default=300)  # 5 minutes default retry
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    channel = db.relationship('Channel', backref='scheduled_messages')
    author = db.relationship('User', foreign_keys=[author_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'author_id': self.author_id,
            'content': self.content,
            'message_type': self.message_type,
            'scheduled_for': self.scheduled_for.isoformat() if self.scheduled_for else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'status': self.status,
            'file_ids': json.loads(self.file_ids) if self.file_ids else [],
            'attempts': self.attempts,
            'last_error': self.last_error,
            'retry_interval_seconds': self.retry_interval_seconds,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class ChannelMute(db.Model):
    """Muted channels for users"""
    __tablename__ = 'channel_mutes'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    muted_until = db.Column(db.DateTime)  # None = permanent mute
    muted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    channel = db.relationship('Channel', backref='mutes')
    user = db.relationship('User', backref='channel_mutes')
    
    # Unique constraint: one mute per user per channel
    __table_args__ = (db.UniqueConstraint('channel_id', 'user_id', name='unique_user_channel_mute'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'user_id': self.user_id,
            'muted_until': self.muted_until.isoformat() if self.muted_until else None,
            'muted_at': self.muted_at.isoformat() if self.muted_at else None,
        }

