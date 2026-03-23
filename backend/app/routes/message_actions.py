"""
Advanced message actions routes (reactions, read receipts, pinning, forwarding)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Message, Channel, ChannelMember, User
from app.models.chat_features import (
    MessageReaction, MessageReadReceipt, PinnedMessage, MessageForward,
    MessageEditHistory
)
from app.utils.logger import log_info, log_error
from app.utils.response import success_response, error_response

message_actions_bp = Blueprint('message_actions', __name__)

@message_actions_bp.route('/<int:message_id>/reactions', methods=['POST'])
@jwt_required()
def add_reaction(message_id):
    """Add or remove a reaction to a message"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    emoji = data.get('emoji', '').strip()
    
    if not emoji:
        return error_response('Emoji is required', 400)
    
    message = Message.query.get(message_id)
    if not message:
        return error_response('Message not found', 404)
    
    # Check if user can view messages in this channel
    member = ChannelMember.query.filter_by(
        channel_id=message.channel_id,
        user_id=current_user_id
    ).first()
    
    if not member:
        return error_response('Access denied', 403)
    
    # Check if reaction already exists
    existing = MessageReaction.query.filter_by(
        message_id=message_id,
        user_id=current_user_id,
        emoji=emoji
    ).first()
    
    if existing:
        # Remove reaction (toggle off)
        db.session.delete(existing)
        message.reaction_count = max(0, (message.reaction_count or 0) - 1)
        action = 'removed'
    else:
        # Add reaction
        reaction = MessageReaction(
            message_id=message_id,
            user_id=current_user_id,
            emoji=emoji
        )
        db.session.add(reaction)
        message.reaction_count = (message.reaction_count or 0) + 1
        action = 'added'
    
    db.session.commit()
    
    # Get updated reactions
    reactions = MessageReaction.query.filter_by(message_id=message_id).all()
    reaction_groups = {}
    for r in reactions:
        if r.emoji not in reaction_groups:
            reaction_groups[r.emoji] = []
        reaction_groups[r.emoji].append(r.user.to_dict() if r.user else None)
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('message_reaction_updated', {
            'message_id': message_id,
            'action': action,
            'emoji': emoji,
            'user_id': current_user_id,
            'reactions': reaction_groups
        }, room=f'channel_{message.channel_id}')
    except Exception as e:
        log_error(f"Failed to emit reaction update: {str(e)}")
    
    return success_response({
        'action': action,
        'emoji': emoji,
        'reactions': reaction_groups,
        'reaction_count': message.reaction_count
    })

@message_actions_bp.route('/<int:message_id>/read', methods=['POST'])
@jwt_required()
def mark_as_read(message_id):
    """Mark a message as read"""
    current_user_id = get_jwt_identity()
    
    message = Message.query.get(message_id)
    if not message:
        return error_response('Message not found', 404)
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(
        channel_id=message.channel_id,
        user_id=current_user_id
    ).first()
    
    if not member:
        return error_response('Access denied', 403)
    
    # Check if already read
    existing = MessageReadReceipt.query.filter_by(
        message_id=message_id,
        user_id=current_user_id
    ).first()
    
    if not existing:
        receipt = MessageReadReceipt(
            message_id=message_id,
            user_id=current_user_id
        )
        db.session.add(receipt)
        message.view_count = (message.view_count or 0) + 1
        
        # Update member's last_read_at
        from datetime import datetime
        member.last_read_at = datetime.utcnow()
        
        db.session.commit()
        
        # Emit read receipt (only to message author and admins)
        try:
            from app import socketio
            socketio.emit('message_read', {
                'message_id': message_id,
                'user_id': current_user_id,
                'read_at': receipt.read_at.isoformat()
            }, room=f'user_{message.author_id}')
        except Exception as e:
            log_error(f"Failed to emit read receipt: {str(e)}")
    
    return success_response({'message': 'Message marked as read'})

@message_actions_bp.route('/<int:message_id>/pin', methods=['POST'])
@jwt_required()
def pin_message(message_id):
    """Pin a message"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    note = data.get('note', '').strip() if data else None
    
    message = Message.query.get(message_id)
    if not message:
        return error_response('Message not found', 404)
    
    # Check if user is admin
    member = ChannelMember.query.filter_by(
        channel_id=message.channel_id,
        user_id=current_user_id
    ).first()
    
    is_admin = member and member.role in ['admin', 'co-admin']
    is_creator = message.channel.created_by == current_user_id
    
    if not is_admin and not is_creator:
        return error_response('Only admins can pin messages', 403)
    
    # Check if already pinned
    existing = PinnedMessage.query.filter_by(
        channel_id=message.channel_id,
        message_id=message_id
    ).first()
    
    if existing:
        return error_response('Message is already pinned', 400)
    
    # Pin message
    pinned = PinnedMessage(
        channel_id=message.channel_id,
        message_id=message_id,
        pinned_by=current_user_id,
        note=note
    )
    db.session.add(pinned)
    message.is_pinned = True
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('message_pinned', {
            'message_id': message_id,
            'channel_id': message.channel_id,
            'pinned_by': current_user_id
        }, room=f'channel_{message.channel_id}')
    except Exception as e:
        log_error(f"Failed to emit pin event: {str(e)}")
    
    return success_response({
        'message': 'Message pinned',
        'pinned_message': pinned.to_dict()
    })

@message_actions_bp.route('/<int:message_id>/unpin', methods=['POST'])
@jwt_required()
def unpin_message(message_id):
    """Unpin a message"""
    current_user_id = get_jwt_identity()
    
    message = Message.query.get(message_id)
    if not message:
        return error_response('Message not found', 404)
    
    # Check if user is admin
    member = ChannelMember.query.filter_by(
        channel_id=message.channel_id,
        user_id=current_user_id
    ).first()
    
    is_admin = member and member.role in ['admin', 'co-admin']
    is_creator = message.channel.created_by == current_user_id
    
    if not is_admin and not is_creator:
        return error_response('Only admins can unpin messages', 403)
    
    # Find and remove pin
    pinned = PinnedMessage.query.filter_by(
        channel_id=message.channel_id,
        message_id=message_id
    ).first()
    
    if not pinned:
        return error_response('Message is not pinned', 404)
    
    db.session.delete(pinned)
    message.is_pinned = False
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('message_unpinned', {
            'message_id': message_id,
            'channel_id': message.channel_id
        }, room=f'channel_{message.channel_id}')
    except Exception as e:
        log_error(f"Failed to emit unpin event: {str(e)}")
    
    return success_response({'message': 'Message unpinned'})

@message_actions_bp.route('/<int:message_id>/forward', methods=['POST'])
@jwt_required()
def forward_message(message_id):
    """Forward a message to another channel"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    target_channel_id = data.get('channel_id')
    
    if not target_channel_id:
        return error_response('Target channel ID is required', 400)
    
    message = Message.query.get(message_id)
    if not message:
        return error_response('Message not found', 404)
    
    # Check if user can view original message
    original_member = ChannelMember.query.filter_by(
        channel_id=message.channel_id,
        user_id=current_user_id
    ).first()
    
    if not original_member:
        return error_response('Access denied to original message', 403)
    
    # Check if user can send to target channel
    target_channel = Channel.query.get(target_channel_id)
    if not target_channel:
        return error_response('Target channel not found', 404)
    
    target_member = ChannelMember.query.filter_by(
        channel_id=target_channel_id,
        user_id=current_user_id
    ).first()
    
    if not target_member:
        return error_response('You are not a member of the target channel', 403)
    
    # Create forwarded message
    forwarded_content = f"[Forwarded from {message.channel.name}]\n{message.content}"
    
    forwarded_message = Message(
        channel_id=target_channel_id,
        author_id=current_user_id,
        content=forwarded_content,
        message_type=message.message_type,
        is_forwarded=True,
        original_message_id=message.id
    )
    
    db.session.add(forwarded_message)
    db.session.flush()
    
    # Track forward
    forward_record = MessageForward(
        original_message_id=message.id,
        forwarded_message_id=forwarded_message.id,
        forwarded_by=current_user_id,
        forwarded_to_channel_id=target_channel_id
    )
    db.session.add(forward_record)
    
    # Update forward count
    message.forward_count = (message.forward_count or 0) + 1
    message.is_forwarded = True
    
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        message_dict = forwarded_message.to_dict()
        socketio.emit('message_received', message_dict, room=f'channel_{target_channel_id}')
    except Exception as e:
        log_error(f"Failed to emit forwarded message: {str(e)}")
    
    return success_response({
        'message': 'Message forwarded',
        'forwarded_message': forwarded_message.to_dict()
    })

@message_actions_bp.route('/<int:message_id>/edit-history', methods=['GET'])
@jwt_required()
def get_edit_history(message_id):
    """Get edit history for a message"""
    current_user_id = get_jwt_identity()
    
    message = Message.query.get(message_id)
    if not message:
        return error_response('Message not found', 404)
    
    # Check if user can view messages
    member = ChannelMember.query.filter_by(
        channel_id=message.channel_id,
        user_id=current_user_id
    ).first()
    
    if not member:
        return error_response('Access denied', 403)
    
    history = MessageEditHistory.query.filter_by(
        message_id=message_id
    ).order_by(MessageEditHistory.edited_at.desc()).all()
    
    return success_response({
        'edit_history': [h.to_dict() for h in history]
    })

