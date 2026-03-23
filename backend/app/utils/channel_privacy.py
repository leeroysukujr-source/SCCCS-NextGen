"""
Privacy utilities for channels - ensure admins cannot access channels they didn't create
"""
from app.models import Channel, ChannelMember, User
from app.utils.roles import is_at_least_admin

def can_access_channel(user_id: int, channel_id: int) -> bool:
    """
    Check if a user can access a channel.
    Admins can access ALL channels (full system management).
    Regular users can access channels they are members of.
    """
    channel = Channel.query.get(channel_id)
    if not channel:
        return False
    
    user = User.query.get(user_id)
    if not user:
        return False
    
    # Admins can access ALL channels
    if is_at_least_admin(user):
        return True
    
    # If user is the creator, they can always access
    if channel.created_by == user_id:
        return True
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(
        channel_id=channel_id, 
        user_id=user_id
    ).first()
    
    return member is not None

def can_view_messages(user_id: int, channel_id: int) -> bool:
    """
    Check if user can view messages in a channel.
    Admins can view messages in ALL channels (full system management).
    Regular users can view messages if they are members or creators.
    """
    channel = Channel.query.get(channel_id)
    if not channel:
        return False
    
    user = User.query.get(user_id)
    if not user:
        return False
    
    # Admins can view messages in ALL channels (full system management)
    if is_at_least_admin(user):
        return True
    
    # Regular users can view messages if they are members or creators
    if channel.created_by == user_id:
        return True
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(
        channel_id=channel_id, 
        user_id=user_id
    ).first()
    
    return member is not None

def can_send_messages(user_id: int, channel_id: int) -> bool:
    """Check if user can send messages in a channel"""
    channel = Channel.query.get(channel_id)
    if not channel:
        return False
    
    user = User.query.get(user_id)
    if not user:
        return False
    
    # Admins can send messages in ALL channels (full system management)
    if is_at_least_admin(user):
        return True
    
    # If user is the creator, they can always send messages (even if not in members table)
    if channel.created_by == user_id:
        return True
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(
        channel_id=channel_id, 
        user_id=user_id
    ).first()
    
    if member:
        return True
    
    # If user is not a member and not the creator, deny access
    return False

