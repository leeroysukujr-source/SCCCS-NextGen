"""
Notification Utilities
"""
from datetime import datetime
from app import db
from app.models.notifications import Notification, NotificationPreference
from app.models import User
from app import socketio
import json

def create_notification(user_id, notification_type, title, message, 
                       resource_type=None, resource_id=None, action_url=None,
                       priority='normal', metadata=None):
    """Create and send a notification"""
    try:
        # Check user preferences
        pref = NotificationPreference.query.filter_by(user_id=user_id).first()
        if pref and not pref.in_app_enabled:
            return None  # User disabled in-app notifications
        
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            resource_type=resource_type,
            resource_id=resource_id,
            action_url=action_url,
            priority=priority,
            meta_data=json.dumps(metadata) if metadata else None
        )
        
        db.session.add(notification)
        db.session.commit()
        
        # Emit real-time notification via Socket.IO
        try:
            socketio.emit('new_notification', notification.to_dict(), room=f'user_{user_id}')
        except Exception as e:
            print(f"Error emitting notification: {e}")
        
        # TODO: Send email/push notifications based on preferences
        
        return notification
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {e}")
        return None

def notify_mentioned_users(message, channel_id, mentioned_user_ids):
    """Notify users who were mentioned in a message"""
    from app.models import Channel
    
    channel = Channel.query.get(channel_id)
    if not channel:
        return
    
    for user_id in mentioned_user_ids:
        create_notification(
            user_id=user_id,
            notification_type='mention',
            title=f"You were mentioned in {channel.name}",
            message=f"@{message.get('author', {}).get('username', 'Someone')} mentioned you",
            resource_type='channel',
            resource_id=channel_id,
            action_url=f'/chat/{channel_id}',
            priority='high'
        )

def notify_channel_members(channel_id, notification_type, title, message, exclude_user_id=None):
    """Notify all members of a channel"""
    from app.models import ChannelMember
    
    members = ChannelMember.query.filter_by(channel_id=channel_id).all()
    
    for member in members:
        if exclude_user_id and member.user_id == exclude_user_id:
            continue
        
        create_notification(
            user_id=member.user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            resource_type='channel',
            resource_id=channel_id,
            action_url=f'/chat/{channel_id}'
        )

