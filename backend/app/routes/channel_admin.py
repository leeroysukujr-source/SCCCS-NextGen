"""
Channel administration routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Channel, ChannelMember, User
from app.models.chat_features import ChannelMute, PinnedMessage
from app.utils.response import success_response, error_response
from datetime import datetime, timedelta

channel_admin_bp = Blueprint('channel_admin', __name__)

def check_admin_permission(user_id, channel_id):
    """Check if user has admin permissions in channel"""
    channel = Channel.query.get(channel_id)
    if not channel:
        return False, None, None
    
    is_creator = channel.created_by == user_id
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
    is_admin = member and member.role in ['admin', 'co-admin']
    
    return (is_creator or is_admin), channel, member

@channel_admin_bp.route('/<int:channel_id>/members/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_member_role(channel_id, user_id):
    """Update member role (promote/demote)"""
    current_user_id = get_jwt_identity()
    
    has_permission, channel, member = check_admin_permission(current_user_id, channel_id)
    if not has_permission:
        return error_response('Only admins can update member roles', 403)
    
    if not channel:
        return error_response('Channel not found', 404)
    
    target_member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
    if not target_member:
        return error_response('User is not a member of this channel', 404)
    
    # Cannot change creator's role
    if channel.created_by == user_id:
        return error_response('Cannot change the creator\'s role', 400)
    
    data = request.get_json()
    new_role = data.get('role', 'member')
    
    if new_role not in ['admin', 'co-admin', 'moderator', 'member']:
        return error_response('Invalid role', 400)
    
    target_member.role = new_role
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('member_role_updated', {
            'channel_id': channel_id,
            'user_id': user_id,
            'new_role': new_role
        }, room=f'channel_{channel_id}')
    except Exception as e:
        pass
    
    return success_response({
        'message': 'Member role updated',
        'member': target_member.to_dict()
    })

@channel_admin_bp.route('/<int:channel_id>/members/<int:user_id>/kick', methods=['POST'])
@jwt_required()
def kick_member(channel_id, user_id):
    """Remove a member from channel"""
    current_user_id = get_jwt_identity()
    
    has_permission, channel, member = check_admin_permission(current_user_id, channel_id)
    if not has_permission:
        return error_response('Only admins can kick members', 403)
    
    if not channel:
        return error_response('Channel not found', 404)
    
    # Cannot kick creator
    if channel.created_by == user_id:
        return error_response('Cannot kick the channel creator', 400)
    
    target_member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
    if not target_member:
        return error_response('User is not a member of this channel', 404)
    
    # Cannot kick other admins (unless you're the creator)
    if target_member.role in ['admin', 'co-admin'] and channel.created_by != current_user_id:
        return error_response('Cannot kick other admins', 403)
    
    db.session.delete(target_member)
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('member_kicked', {
            'channel_id': channel_id,
            'user_id': user_id,
            'kicked_by': current_user_id
        }, room=f'channel_{channel_id}')
    except Exception as e:
        pass
    
    return success_response({'message': 'Member removed from channel'})

@channel_admin_bp.route('/<int:channel_id>/members/<int:user_id>/mute', methods=['POST'])
@jwt_required()
def mute_member(channel_id, user_id):
    """Mute a member (prevent them from sending messages)"""
    current_user_id = get_jwt_identity()
    
    has_permission, channel, member = check_admin_permission(current_user_id, channel_id)
    if not has_permission:
        return error_response('Only admins can mute members', 403)
    
    if not channel:
        return error_response('Channel not found', 404)
    
    target_member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
    if not target_member:
        return error_response('User is not a member of this channel', 404)
    
    data = request.get_json()
    duration_hours = data.get('duration_hours', None)  # None = permanent
    
    # Check if already muted
    existing_mute = ChannelMute.query.filter_by(
        channel_id=channel_id,
        user_id=user_id
    ).first()
    
    if existing_mute:
        return error_response('Member is already muted', 400)
    
    muted_until = None
    if duration_hours:
        muted_until = datetime.utcnow() + timedelta(hours=duration_hours)
    
    mute = ChannelMute(
        channel_id=channel_id,
        user_id=user_id,
        muted_until=muted_until
    )
    db.session.add(mute)
    target_member.is_muted = True
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('member_muted', {
            'channel_id': channel_id,
            'user_id': user_id,
            'muted_until': muted_until.isoformat() if muted_until else None
        }, room=f'channel_{channel_id}')
    except Exception as e:
        pass
    
    return success_response({
        'message': 'Member muted',
        'mute': mute.to_dict()
    })

@channel_admin_bp.route('/<int:channel_id>/members/<int:user_id>/unmute', methods=['POST'])
@jwt_required()
def unmute_member(channel_id, user_id):
    """Unmute a member"""
    current_user_id = get_jwt_identity()
    
    has_permission, channel, member = check_admin_permission(current_user_id, channel_id)
    if not has_permission:
        return error_response('Only admins can unmute members', 403)
    
    if not channel:
        return error_response('Channel not found', 404)
    
    mute = ChannelMute.query.filter_by(channel_id=channel_id, user_id=user_id).first()
    if not mute:
        return error_response('Member is not muted', 404)
    
    target_member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
    if target_member:
        target_member.is_muted = False
    
    db.session.delete(mute)
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('member_unmuted', {
            'channel_id': channel_id,
            'user_id': user_id
        }, room=f'channel_{channel_id}')
    except Exception as e:
        pass
    
    return success_response({'message': 'Member unmuted'})

@channel_admin_bp.route('/<int:channel_id>/pinned', methods=['GET'])
@jwt_required()
def get_pinned_messages(channel_id):
    """Get all pinned messages in a channel"""
    current_user_id = get_jwt_identity()
    
    channel = Channel.query.get(channel_id)
    if not channel:
        return error_response('Channel not found', 404)
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    if not member:
        return error_response('Access denied', 403)
    
    pinned = PinnedMessage.query.filter_by(channel_id=channel_id).order_by(
        PinnedMessage.pinned_at.desc()
    ).all()
    
    return success_response({
        'pinned_messages': [p.to_dict() for p in pinned]
    })

@channel_admin_bp.route('/<int:channel_id>/settings', methods=['PUT'])
@jwt_required()
def update_channel_settings(channel_id):
    """Update channel settings"""
    current_user_id = get_jwt_identity()
    
    has_permission, channel, member = check_admin_permission(current_user_id, channel_id)
    if not has_permission:
        return error_response('Only admins can update channel settings', 403)
    
    if not channel:
        return error_response('Channel not found', 404)
    
    data = request.get_json()
    
    # Update allowed settings
    if 'name' in data:
        channel.name = data['name'].strip()
    if 'description' in data:
        channel.description = data.get('description', '').strip()
    if 'max_members' in data:
        channel.max_members = data['max_members']
    if 'allow_file_sharing' in data:
        channel.allow_file_sharing = data['allow_file_sharing']
    if 'allow_message_editing' in data:
        channel.allow_message_editing = data['allow_message_editing']
    if 'allow_message_deletion' in data:
        channel.allow_message_deletion = data['allow_message_deletion']
    if 'default_message_ttl' in data:
        channel.default_message_ttl = data['default_message_ttl']
    
    channel.updated_at = datetime.utcnow()
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('channel_settings_updated', {
            'channel_id': channel_id,
            'settings': channel.to_dict()
        }, room=f'channel_{channel_id}')
    except Exception as e:
        pass
    
    return success_response({
        'message': 'Channel settings updated',
        'channel': channel.to_dict()
    })

