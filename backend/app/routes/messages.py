from flask import Blueprint, request, jsonify
import json
import traceback
from app.utils.logger import log_error
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Message, Channel, ChannelMember, File, User
from app.models.notifications import Notification
from app.utils.encryption import encrypt_message, decrypt_message
from app.utils.channel_privacy import can_view_messages, can_send_messages
from app.utils.roles import is_at_least_admin
from app.models.chat_features import ScheduledMessage
from datetime import datetime
from app.utils.middleware import feature_required
from app.services.feature_flags import get_feature_config

messages_bp = Blueprint('messages', __name__)

@messages_bp.before_request
@feature_required('messages')
def check_messages_enabled():
    pass

@messages_bp.route('/channel/<int:channel_id>', methods=['POST'])
@jwt_required()
def create_message(channel_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}

        channel = Channel.query.get(channel_id)
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404

        # Check if user can send messages
        if not can_send_messages(current_user_id, channel_id):
            # Provide more detailed error message
            member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
            if not member:
                return jsonify({
                    'error': 'You are not a member of this channel. Please ask the channel administrator to add you.'
                }), 403
            else:
                return jsonify({
                    'error': 'Access denied. You do not have permission to send messages in this channel.'
                }), 403

        # Get current user to check workspace
        current_user = User.query.get(current_user_id)
        
        # Get feature config for runtime limits
        feature_config = get_feature_config('messages', current_user.workspace_id)
        
        # Encrypt message content if encryption is enabled
        content = data.get('content', '')
        
        # Enforce max message length
        max_len = feature_config.get('max_message_length', 5000)
        if len(content) > max_len:
            return jsonify({'error': f'Message exceeds maximum length of {max_len} characters'}), 400
            
        message_type = data.get('message_type', 'text')
        file_ids = data.get('file_ids', [])
        mentions = data.get('mentions', [])  # List of mentioned user IDs
        
        # Parse mentions from content (extract @username patterns)
        if not mentions and content:
            import re
            mention_pattern = r'@(\w+)'
            mentioned_usernames = re.findall(mention_pattern, content)
            if mentioned_usernames:
                mentioned_users = User.query.filter(User.username.in_(mentioned_usernames)).all()
                mentions = [u.id for u in mentioned_users]

        # Ensure mentions is stored as JSON string for the DB (sqlite doesn't accept Python lists)
        mentions_serialized = None
        try:
            if mentions:
                mentions_serialized = json.dumps(mentions)
        except Exception:
            mentions_serialized = None

        if channel.is_encrypted and channel.encryption_key and content:
            try:
                encryption_key = channel.encryption_key.encode('utf-8')
                content = encrypt_message(content, encryption_key)
            except Exception:
                # Continue without encryption if it fails (non-critical)
                pass

        message = Message(
            channel_id=channel_id,
            author_id=current_user_id,
            content=content,
            message_type=message_type,
            thread_id=data.get('thread_id'),
            mentions=mentions_serialized,
            is_encrypted=channel.is_encrypted if channel else True
        )

        db.session.add(message)
        db.session.flush()  # Get message ID

        # Handle file attachments
        if data.get('file_ids'):
            for file_id in data.get('file_ids', []):
                file_obj = File.query.get(file_id)
                if file_obj:
                    file_obj.message_id = message.id
                    db.session.add(file_obj)

        db.session.commit()

        # Create notifications for channel members (except sender)
        # Also create special notifications for mentioned users
        members = ChannelMember.query.filter_by(channel_id=channel_id).filter(
            ChannelMember.user_id != current_user_id
        ).all()

        sender = User.query.get(current_user_id)
        sender_name = f"{sender.first_name} {sender.last_name}" if sender else "Someone"

        for member in members:
            # Check if user was mentioned
            is_mentioned = member.user_id in mentions if mentions else False

            notification = Notification(
                user_id=member.user_id,
                notification_type='mention' if is_mentioned else 'message',
                title=f'{"Mentioned" if is_mentioned else "New message"} in {channel.name}',
                message=f'{sender_name} {"mentioned you" if is_mentioned else "sent a message"}: {("[Encrypted message]" if channel.is_encrypted else content[:100])}',
                resource_type='channel',
                resource_id=channel_id,
                action_url=f'/chat/{channel_id}',
                priority='high' if is_mentioned else 'normal'
            )
            db.session.add(notification)

        db.session.commit()

        # Prepare message dict for response and socket
        message_dict = message.to_dict()

        # Decrypt message content if encrypted (for both socket and response)
        if channel.is_encrypted and channel.encryption_key and message.is_encrypted:
            try:
                encryption_key = channel.encryption_key.encode('utf-8')
                if message_dict.get('content') and message_dict['content'] != '[File]':
                    decrypted = decrypt_message(message_dict['content'], encryption_key)
                    # Handle legacy double-encryption (if content is still a Fernet token)
                    if decrypted and decrypted.startswith('gAAAA'):
                        try:
                            decrypted = decrypt_message(decrypted, encryption_key)
                        except:
                            pass
                    message_dict['content'] = decrypted
            except Exception:
                # Decryption failed - show placeholder
                message_dict['content'] = '[Message]'

        # Emit real-time message via Socket.IO
        try:
            from app import socketio
            socketio.emit('message_received', message_dict, room=f'channel_{channel_id}')
        except Exception:
            # Socket.IO emit failed - non-critical, continue
            pass

        return jsonify(message_dict), 201
    except Exception as e:
        # Log detailed traceback to help debugging client-side 500s
        tb = traceback.format_exc()
        log_error(f"create_message error: {str(e)}\n{tb}", path=request.path)
        return jsonify({'error': 'An unexpected error occurred', 'detail': str(e)}), 500

@messages_bp.route('/channel/<int:channel_id>', methods=['GET'])
@jwt_required()
def get_messages(channel_id):
    current_user_id = get_jwt_identity()
    
    # Check privacy - admins can only view messages in channels they created
    if not can_view_messages(current_user_id, channel_id):
        return jsonify({'error': 'Access denied. You do not have permission to view messages in this channel.'}), 403
    
    channel = Channel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Get messages (not threaded replies)
    messages = Message.query.filter_by(channel_id=channel_id, thread_id=None).order_by(
        Message.created_at.desc()
    ).limit(50).all()
    
    # Decrypt messages if encryption is enabled
    if channel.is_encrypted and channel.encryption_key:
        try:
            encryption_key = channel.encryption_key.encode('utf-8')
            for message in messages:
                if message.is_encrypted and message.content:
                    decrypted = decrypt_message(message.content, encryption_key)
                    # Handle legacy double-encryption
                    if decrypted and decrypted.startswith('gAAAA'):
                        try:
                            decrypted = decrypt_message(decrypted, encryption_key)
                        except:
                            pass
                    message.content = decrypted
        except Exception as e:
            # Decryption failed - continue with encrypted content
            import traceback
            print(f"Decryption failed for message: {e}")
            traceback.print_exc()
            pass
    
    # Update last read
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    if member:
        from datetime import datetime
        member.last_read_at = datetime.utcnow()
        db.session.commit()
    
    messages_dict = [message.to_dict() for message in reversed(messages)]
    
    # Include encryption key in response for members
    if channel.created_by == current_user_id and channel.encryption_key:
        for msg in messages_dict:
            msg['encryption_key'] = channel.encryption_key
    
    return jsonify(messages_dict), 200


@messages_bp.route('/channel/<int:channel_id>/schedule', methods=['POST'])
@jwt_required()
def schedule_message(channel_id):
    """Schedule a message to be sent later in a channel."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}

        channel = Channel.query.get(channel_id)
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404

        # Permission: must be able to send messages
        if not can_send_messages(current_user_id, channel_id):
            return jsonify({'error': 'Access denied. Cannot schedule messages in this channel.'}), 403

        content = data.get('content', '')
        if not content:
            return jsonify({'error': 'Content is required'}), 400

        message_type = data.get('message_type', 'text')
        file_ids = data.get('file_ids', [])
        scheduled_for_raw = data.get('scheduled_for')
        if not scheduled_for_raw:
            return jsonify({'error': 'scheduled_for datetime is required (ISO format)'}), 400

        # Parse ISO datetime (support trailing Z)
        try:
            if isinstance(scheduled_for_raw, str) and scheduled_for_raw.endswith('Z'):
                scheduled_for_raw = scheduled_for_raw.replace('Z', '+00:00')
            scheduled_for = datetime.fromisoformat(scheduled_for_raw)
        except Exception:
            return jsonify({'error': 'Invalid scheduled_for datetime. Use ISO format.'}), 400

        sched = ScheduledMessage(
            channel_id=channel_id,
            author_id=current_user_id,
            content=content,
            message_type=message_type,
            scheduled_for=scheduled_for,
            file_ids=json.dumps(file_ids) if file_ids else None
        )
        db.session.add(sched)
        db.session.commit()

        return jsonify(sched.to_dict()), 201
    except Exception as e:
        tb = traceback.format_exc()
        log_error(f"schedule_message error: {str(e)}\n{tb}", path=request.path)
        return jsonify({'error': 'An unexpected error occurred', 'detail': str(e)}), 500


@messages_bp.route('/channel/<int:channel_id>/scheduled', methods=['GET'])
@jwt_required()
def list_scheduled_messages(channel_id):
    """List scheduled messages for a channel. Authors see their own; channel admins see all."""
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404

    # Check membership
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    if not member:
        return jsonify({'error': 'Access denied. You are not a member of this channel.'}), 403

    if member.role in ['admin', 'co-admin']:
        scheds = ScheduledMessage.query.filter_by(channel_id=channel_id).order_by(ScheduledMessage.scheduled_for.asc()).all()
    else:
        scheds = ScheduledMessage.query.filter_by(channel_id=channel_id, author_id=current_user_id).order_by(ScheduledMessage.scheduled_for.asc()).all()

    return jsonify([s.to_dict() for s in scheds]), 200


@messages_bp.route('/scheduled/<int:scheduled_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_scheduled_message(scheduled_id):
    current_user_id = get_jwt_identity()
    sched = ScheduledMessage.query.get(scheduled_id)
    if not sched:
        return jsonify({'error': 'Scheduled message not found'}), 404

    # Only author or channel admin can cancel
    member = ChannelMember.query.filter_by(channel_id=sched.channel_id, user_id=current_user_id).first()
    is_admin = member and member.role in ['admin', 'co-admin']
    if sched.author_id != current_user_id and not is_admin:
        return jsonify({'error': 'Unauthorized to cancel this scheduled message'}), 403

    sched.status = 'cancelled'
    db.session.add(sched)
    db.session.commit()

    return jsonify({'message': 'Scheduled message cancelled'}), 200

@messages_bp.route('/<int:message_id>', methods=['GET'])
@jwt_required()
def get_message(message_id):
    message = Message.query.get(message_id)
    
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    return jsonify(message.to_dict()), 200

@messages_bp.route('/<int:message_id>', methods=['PUT'])
@jwt_required()
def update_message(message_id):
    current_user_id = get_jwt_identity()
    message = Message.query.get(message_id)
    
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    if message.author_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Check if channel allows message editing
    channel = Channel.query.get(message.channel_id)
    if channel and hasattr(channel, 'allow_message_editing') and not channel.allow_message_editing:
        return jsonify({'error': 'Message editing is disabled in this channel'}), 403
    
    data = request.get_json()
    if 'content' in data:
        # Save edit history
        from app.models.chat_features import MessageEditHistory
        old_content = message.content
        message.content = data['content']
        message.is_edited = True
        
        # Create edit history entry
        edit_history = MessageEditHistory(
            message_id=message_id,
            old_content=old_content,
            edited_by=current_user_id
        )
        db.session.add(edit_history)
    
    db.session.commit()
    
    # Emit message update via Socket.IO
    try:
        from app import socketio
        message_dict = message.to_dict()
        socketio.emit('message_updated', message_dict, room=f'channel_{message.channel_id}')
    except Exception:
        # Socket.IO emit failed - non-critical, continue
        pass
    
    return jsonify(message.to_dict()), 200

@messages_bp.route('/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    current_user_id = get_jwt_identity()
    message = Message.query.get(message_id)
    
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    # Check if user is the author or an admin
    current_user = User.query.get(current_user_id)
    is_admin_user = is_at_least_admin(current_user)
    is_author = message.author_id == current_user_id
    
    if not is_author and not is_admin_user:
        return jsonify({'error': 'Unauthorized. Only message authors and admins can delete messages.'}), 403
    
    channel_id = message.channel_id
    db.session.delete(message)
    db.session.commit()
    
    # Emit message deletion via Socket.IO
    try:
        from app import socketio
        socketio.emit('message_deleted', {
            'message_id': message_id,
            'channel_id': channel_id
        }, room=f'channel_{channel_id}')
    except Exception:
        # Socket.IO emit failed - non-critical, continue
        pass
    
    return jsonify({'message': 'Message deleted'}), 200

@messages_bp.route('/<int:message_id>/thread', methods=['GET'])
@jwt_required()
def get_thread_messages(message_id):
    message = Message.query.get(message_id)
    
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    thread_messages = Message.query.filter_by(thread_id=message_id).order_by(
        Message.created_at.asc()
    ).all()
    
    return jsonify([msg.to_dict() for msg in thread_messages]), 200

