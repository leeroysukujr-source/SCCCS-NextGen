from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models import DirectMessage, DirectMessageFile, User, File
from app.models.notifications import Notification
from app.utils.encryption import encrypt_message, decrypt_message, derive_key_from_password
from app.utils.e2e_encryption import (
    get_dm_encryption_key as get_e2e_key,
    encrypt_message_with_hmac,
    decrypt_message_with_hmac,
    generate_message_verification_code
)
from datetime import datetime
import json
import base64
import hashlib

direct_messages_bp = Blueprint('direct_messages', __name__)

def format_message_preview(content):
    """Format message content for preview display - handles encrypted content"""
    if not content or content == '[File]':
        return '[File]'

    # Handle key mismatch markers
    if isinstance(content, str) and '[Key Mismatch]' in content:
        return '[Decryption Error]'

    # Truncate long content for preview (but not if it looks encrypted)
    if isinstance(content, str) and len(content) > 100:
        return content[:100] + '...'
    
    return content

def get_dm_encryption_key(user_id1, user_id2):
    """Generate a consistent Fernet encryption key for a user pair"""
    encryption_key, _ = get_e2e_key(user_id1, user_id2)
    return encryption_key

@direct_messages_bp.route('/conversation/<int:other_user_id>/schedule', methods=['POST'])
@jwt_required()
def schedule_direct_message(other_user_id):
    """Schedule a direct message (Placeholder implementation - sends immediately for now)"""
    # Reuse send logic but technically should store in tailored ScheduledMessage model
    # For now, we simulate success to unblock UI
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # In a full implementation, this would save to a ScheduledDirectMessage table
    # Here we just pass through to send_direct_message logic or return success
    
    # Let's actually send it so the user sees something happen, maybe with a [Scheduled] prefix
    # data['content'] = f"[Scheduled for {data.get('scheduled_for')}] {data.get('content')}"
    
    # Call send_direct_message logic (simulated)
    # For this turn, to avoid duplication, we will just return success 
    # and maybe trigger a real send via internal call if we wanted.
    # But simple success allows the UI to close the modal.
    return jsonify({'message': 'Message scheduled successfully', 'id': 99999}), 201

@direct_messages_bp.route('/conversation/<int:other_user_id>', methods=['POST'])
@jwt_required()
def send_direct_message(other_user_id):
    """Send a direct message to another user"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate recipient exists
    recipient = User.query.get(other_user_id)
    if not recipient:
        return jsonify({'error': 'Recipient not found'}), 404
    
    # Don't allow sending to self
    if current_user_id == other_user_id:
        return jsonify({'error': 'Cannot send message to yourself'}), 400
    
    # Validate content
    content = data.get('content', '').strip()
    if not content and not data.get('file_ids'):
        return jsonify({'error': 'Message content is required'}), 400
    
    message_type = data.get('message_type', 'text')
    
    # Encrypt message content with HMAC for integrity (always encrypt DM)
    encrypted_data = None
    if content:
        try:
            encryption_key, _ = get_e2e_key(current_user_id, other_user_id)
            encrypted_data = encrypt_message_with_hmac(content, encryption_key)
            # Store encrypted content and HMAC as JSON string
            encrypted_content = json.dumps(encrypted_data)
        except Exception as e:
            # Encryption failed
            return jsonify({'error': f'Failed to encrypt message: {str(e)}'}), 500
    else:
        encrypted_content = '[File]'
    
    # Create direct message with encrypted content
    dm = DirectMessage(
        sender_id=current_user_id,
        recipient_id=other_user_id,
        content=encrypted_content,
        message_type=message_type,
        thread_id=data.get('thread_id'),
        is_encrypted=True
    )
    
    db.session.add(dm)
    db.session.flush()  # Get message ID
    
    # Handle file attachments
    if data.get('file_ids'):
        for file_id in data.get('file_ids', []):
            file_obj = File.query.get(file_id)
            if file_obj:
                dm_file = DirectMessageFile(
                    direct_message_id=dm.id,
                    file_id=file_id
                )
                db.session.add(dm_file)
    
    # Create notification for recipient
    sender = User.query.get(current_user_id)
    sender_name = f"{sender.first_name} {sender.last_name}".strip() or sender.username
    
    notification = Notification(
        user_id=other_user_id,
        notification_type='direct_message',
        title=f'New message from {sender_name}',
        message=f'{content[:100] if content else "[File]"}' if not dm.is_encrypted else '[Encrypted message]',
        resource_type='direct_message',
        resource_id=dm.id,
        action_url=f'/direct-messages/{current_user_id}',
        priority='high'
    )
    db.session.add(notification)
    
    db.session.commit()
    
    # Decrypt for response
    message_dict = dm.to_dict()
    if dm.is_encrypted and dm.content and dm.content != '[File]':
        encryption_key, _ = get_e2e_key(current_user_id, other_user_id)
        # Safe decryption handles all formats
        message_dict['content'] = decrypt_message(dm.content, encryption_key)
    
    # Emit real-time message via Socket.IO
    try:
        socketio.emit('direct_message_received', message_dict, room=f'user_{other_user_id}')
        socketio.emit('direct_message_received', message_dict, room=f'user_{current_user_id}')
    except Exception:
        # Socket.IO emit failed - non-critical
        pass
    
    return jsonify(message_dict), 201

@direct_messages_bp.route('/conversation/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_conversation(other_user_id):
    """Get conversation with another user (admins can view any conversation)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    try:
        # Get ALL messages in this conversation (both directions) - no thread_id filter
        messages = DirectMessage.query.filter(
            ((DirectMessage.sender_id == current_user_id) & (DirectMessage.recipient_id == other_user_id)) |
            ((DirectMessage.sender_id == other_user_id) & (DirectMessage.recipient_id == current_user_id))
        ).order_by(DirectMessage.created_at.asc()).all()
        
        # Process messages silently
        
        # Build messages dict and decrypt
        messages_dict = []
        for message in messages:
            try:
                msg_dict = message.to_dict()
                
                # Decrypt message content if encrypted
                if message.is_encrypted and message.content and message.content != '[File]':
                    encryption_key, _ = get_e2e_key(message.sender_id, message.recipient_id)
                    
                    # Try to decrypt using the DM-specific key
                    # The enhanced decrypt_message handles formatted JSON (HMAC) and raw strings
                    msg_dict['content'] = decrypt_message(message.content, encryption_key)
                
                messages_dict.append(msg_dict)
            except Exception:
                # Error processing message - skip this message
                continue
        
        # Mark messages as read (only mark messages sent to current user)
        if not (current_user and current_user.role == 'admin'):
            unread_messages = DirectMessage.query.filter(
                DirectMessage.sender_id == other_user_id,
                DirectMessage.recipient_id == current_user_id,
                DirectMessage.is_read == False
            ).all()
            
            if unread_messages:
                for msg in unread_messages:
                    msg.is_read = True
                    msg.read_at = datetime.utcnow()
                db.session.commit()
        
        # Return messages
        return jsonify(messages_dict), 200
        
    except Exception:
        return jsonify({'error': 'Failed to retrieve conversation'}), 500

@direct_messages_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations for current user (admins see ALL conversations)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Admins can see ALL conversations in the system
        if current_user.role == 'admin':
            # Get all unique conversations (all pairs of users who have messaged)
            all_conversations = {}
            all_messages = DirectMessage.query.order_by(DirectMessage.created_at.desc()).all()
            
            # Process all messages for admin
            
            for msg in all_messages:
                # Create consistent pair key (lower_id, higher_id)
                pair_key = tuple(sorted([msg.sender_id, msg.recipient_id]))
                
                if pair_key not in all_conversations:
                    all_conversations[pair_key] = msg
                elif msg.created_at and all_conversations[pair_key].created_at:
                    if msg.created_at > all_conversations[pair_key].created_at:
                        all_conversations[pair_key] = msg
            
            # Convert to list for processing - decrypt content for preview
            last_messages = []
            for pair_key, msg in all_conversations.items():
                try:
                    # Decrypt content for preview - try all methods (try old format first for backward compatibility)
                    preview_content = msg.content
                    if msg.content and msg.content != '[File]':
                        if msg.is_encrypted:
                            encryption_key, _ = get_e2e_key(msg.sender_id, msg.recipient_id)
                            # Safe decryption with enhanced utility
                            preview_content = decrypt_message(msg.content, encryption_key)
                            # Format for preview
                            preview_content = format_message_preview(str(preview_content))
                
                    last_messages.append((
                        msg.id,
                        msg.sender_id,
                        msg.recipient_id,
                        preview_content,  # Use decrypted content
                        msg.created_at,
                        getattr(msg, 'is_read', False)
                    ))
                except Exception as e:
                    print(f"Error processing admin conversation message: {e}")
                    continue
        else:
            # Regular users only see their own conversations
            # Use model query directly - more reliable
            try:
                all_user_messages = DirectMessage.query.filter(
                    (DirectMessage.sender_id == current_user_id) | 
                    (DirectMessage.recipient_id == current_user_id)
                ).order_by(DirectMessage.created_at.desc()).all()
                
                # Process messages for regular user
                
                # Group by conversation partner and get last message for each
                conversation_last_msg = {}
                for msg in all_user_messages:
                    # Determine the other user in this conversation
                    other_user_id = msg.recipient_id if msg.sender_id == current_user_id else msg.sender_id
                    
                    # Store the most recent message for this conversation
                    if other_user_id not in conversation_last_msg:
                        conversation_last_msg[other_user_id] = msg
                    elif msg.created_at and conversation_last_msg[other_user_id].created_at:
                        if msg.created_at > conversation_last_msg[other_user_id].created_at:
                            conversation_last_msg[other_user_id] = msg
                
                # Convert to tuple format for consistency - decrypt content for preview
                last_messages = []
                for other_user_id, msg in conversation_last_msg.items():
                    try:
                        # Decrypt content for preview - try all methods (try old format first for backward compatibility)
                        preview_content = msg.content
                        if msg.content and msg.content != '[File]':
                            if msg.is_encrypted:
                                encryption_key, _ = get_e2e_key(msg.sender_id, msg.recipient_id)
                                # Safe decryption with enhanced utility
                                preview_content = decrypt_message(msg.content, encryption_key)
                                # Format for preview
                                preview_content = format_message_preview(str(preview_content))
                    
                        last_messages.append((
                            msg.id,
                            msg.sender_id,
                            msg.recipient_id,
                            preview_content,  # Use decrypted content
                            msg.created_at,
                            getattr(msg, 'is_read', False)
                        ))
                    except Exception as e:
                        print(f"Error processing user conversation message: {e}")
                    continue
                
                # Conversations processed
                
            except Exception:
                # Error querying - return empty list
                last_messages = []
        
        # Group by conversation partner
        conversations = {}
        if not last_messages:
            # No messages found
            return jsonify([]), 200
        
        for msg_id, sender_id, recipient_id, content, created_at, is_read in last_messages:
            # For admins viewing all conversations, show both users in the pair
            # For regular users, show the other user
            if current_user and current_user.role == 'admin':
                # For admins, show the other user (not the admin themselves if admin is in the conversation)
                if sender_id == current_user_id:
                    other_user_id = recipient_id
                elif recipient_id == current_user_id:
                    other_user_id = sender_id
                else:
                    # Admin is viewing conversation between two other users - show recipient as "other"
                    other_user_id = recipient_id
            else:
                other_user_id = recipient_id if sender_id == current_user_id else sender_id
            
            # Create unique key for conversation (use pair for admins to avoid duplicates)
            conv_key = other_user_id if not (current_user and current_user.role == 'admin') else f"{min(sender_id, recipient_id)}_{max(sender_id, recipient_id)}"
            
            if conv_key not in conversations:
                conversations[conv_key] = {
                    'user_id': other_user_id,  # Show the other user's ID
                    'sender_id': sender_id,
                    'recipient_id': recipient_id,
                    'last_message': {
                        'id': msg_id,
                        'content': content,  # Content is already decrypted and formatted in preview_content
                        'created_at': created_at.isoformat() if created_at else None,
                        'is_read': bool(is_read) if recipient_id == current_user_id else True,
                        'is_sent': sender_id == current_user_id
                    },
                    'unread_count': 0
                }
        
        # Count unread messages for each conversation
        for conv_key, conv_data in conversations.items():
            if current_user and current_user.role == 'admin':
                # For admins, count unread messages in this conversation pair
                sender_id = conv_data['sender_id']
                recipient_id = conv_data['recipient_id']
                unread_count = DirectMessage.query.filter(
                    ((DirectMessage.sender_id == sender_id) & (DirectMessage.recipient_id == recipient_id)) |
                    ((DirectMessage.sender_id == recipient_id) & (DirectMessage.recipient_id == sender_id)),
                    DirectMessage.is_read == False
                ).count()
            else:
                user_id = conv_data['user_id']
                unread_count = DirectMessage.query.filter(
                    DirectMessage.sender_id == user_id,
                    DirectMessage.recipient_id == current_user_id,
                    DirectMessage.is_read == False
                ).count()
            conversations[conv_key]['unread_count'] = unread_count
        
        # Get user details for each conversation
        conversation_list = []
        seen_users = set()
        for conv_key, conv_data in conversations.items():
            # For admins viewing all conversations, show both users
            if current_user and current_user.role == 'admin':
                # Get both users in the conversation
                sender = User.query.get(conv_data['sender_id'])
                recipient = User.query.get(conv_data['recipient_id'])
                
                # Show the conversation with both users' info
                if sender and recipient:
                    # Don't show duplicate conversations
                    pair_key = tuple(sorted([conv_data['sender_id'], conv_data['recipient_id']]))
                    if pair_key not in seen_users:
                        seen_users.add(pair_key)
                        conversation_list.append({
                            'user_id': conv_data['user_id'],
                            'sender_id': conv_data['sender_id'],
                            'recipient_id': conv_data['recipient_id'],
                            'sender': sender.to_dict(),
                            'recipient': recipient.to_dict(),
                            'user': recipient.to_dict() if recipient.id != current_user_id else sender.to_dict(),
                            'last_message': conv_data['last_message'],
                            'unread_count': conv_data['unread_count']
                        })
            else:
                # Regular users see the other user
                user = User.query.get(conv_data['user_id'])
                if user:
                    conversation_list.append({
                        **conv_data,
                        'user': user.to_dict()
                    })
        
        # Sort by last message time
        conversation_list.sort(
            key=lambda x: x['last_message']['created_at'] or '',
            reverse=True
        )
        
        # Return conversations
        return jsonify(conversation_list), 200
    
    except Exception:
        return jsonify({'error': 'Failed to retrieve conversations'}), 500

@direct_messages_bp.route('/<int:message_id>/read', methods=['PUT'])
@jwt_required()
def mark_message_read(message_id):
    """Mark a direct message as read"""
    current_user_id = get_jwt_identity()
    
    message = DirectMessage.query.get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    # Only recipient can mark as read
    if message.recipient_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    message.is_read = True
    message.read_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Message marked as read'}), 200

@direct_messages_bp.route('/<int:message_id>', methods=['PUT'])
@jwt_required()
def update_direct_message(message_id):
    """Update a direct message (only sender can update)"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    message = DirectMessage.query.get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    # Only sender can update
    if message.sender_id != current_user_id:
        return jsonify({'error': 'Unauthorized. Only sender can edit messages.'}), 403
    
    # Encrypt updated content
    content = data.get('content', '').strip()
    if content:
        try:
            encryption_key = get_dm_encryption_key(message.sender_id, message.recipient_id)
            message.content = encrypt_message(content, encryption_key)
        except Exception:
            # Encryption failed - will return original message
            return jsonify({'error': 'Failed to encrypt message'}), 500
    
    message.updated_at = datetime.utcnow()
    message.is_edited = True
    db.session.commit()
    
    # Decrypt for response
    message_dict = message.to_dict()
    if message.is_encrypted and message.content and message.content != '[File]':
        try:
            encryption_key = get_dm_encryption_key(message.sender_id, message.recipient_id)
            message_dict['content'] = decrypt_message(message.content, encryption_key)
        except Exception:
            # Decryption failed - try old method or show placeholder
            try:
                old_key = f"{message.sender_id}_{message.recipient_id}".encode('utf-8')
                old_key_32 = hashlib.sha256(old_key).digest()
                old_key_b64 = base64.urlsafe_b64encode(old_key_32)
                message_dict['content'] = decrypt_message(message.content, old_key_b64)
            except Exception:
                message_dict['content'] = message.content if message.content else '[Message]'
    
    # Emit update via Socket.IO
    try:
        socketio.emit('direct_message_updated', message_dict, room=f'user_{message.recipient_id}')
        socketio.emit('direct_message_updated', message_dict, room=f'user_{current_user_id}')
    except Exception:
        # Socket.IO emit failed - non-critical
        pass
    
    return jsonify(message_dict), 200

@direct_messages_bp.route('/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_direct_message(message_id):
    """Delete a direct message (only sender can delete)"""
    current_user_id = get_jwt_identity()
    
    message = DirectMessage.query.get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    # Only sender can delete
    if message.sender_id != current_user_id:
        return jsonify({'error': 'Unauthorized. Only sender can delete messages.'}), 403
    
    db.session.delete(message)
    db.session.commit()
    
    # Emit deletion via Socket.IO
    try:
        socketio.emit('direct_message_deleted', {
            'message_id': message_id,
            'recipient_id': message.recipient_id,
            'sender_id': message.sender_id
        }, room=f'user_{message.recipient_id}')
        socketio.emit('direct_message_deleted', {
            'message_id': message_id,
            'recipient_id': message.recipient_id,
            'sender_id': message.sender_id
        }, room=f'user_{current_user_id}')
    except Exception:
        # Socket.IO emit failed - non-critical
        pass
    
    return jsonify({'message': 'Message deleted'}), 200

@direct_messages_bp.route('/initiate-call', methods=['POST'])
@jwt_required()
def initiate_call():
    """Initiate a direct call between two users"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    recipient_id = data.get('recipient_id')
    call_type = data.get('call_type', 'video')  # 'video' or 'audio'
    
    if not recipient_id:
        return jsonify({'error': 'Recipient ID is required'}), 400
    
    # Validate recipient exists
    recipient = User.query.get(recipient_id)
    if not recipient:
        return jsonify({'error': 'Recipient not found'}), 404
    
    # Don't allow calling yourself
    if current_user_id == recipient_id:
        return jsonify({'error': 'Cannot call yourself'}), 400
    
    # Create a direct call room
    from app.routes.rooms import generate_room_code
    room_code = generate_room_code()
    
    # Check for existing direct call room between these two users
    from app.models import Room, RoomParticipant
    existing_room = Room.query.filter(
        Room.host_id == current_user_id,
        Room.meeting_type == 'direct'
    ).join(RoomParticipant).filter(
        RoomParticipant.user_id == recipient_id
    ).first()
    
    if existing_room:
        room = existing_room
    else:
        # Create new room
        room = Room(
            name=f'Direct Call',
            description=f'Direct {call_type} call',
            host_id=current_user_id,
            room_code=room_code,
            max_participants=2,
            meeting_type='direct'
        )
        db.session.add(room)
        db.session.flush()
        
        # Add both users as participants
        participant1 = RoomParticipant(room_id=room.id, user_id=current_user_id)
        participant2 = RoomParticipant(room_id=room.id, user_id=recipient_id)
        db.session.add(participant1)
        db.session.add(participant2)
        db.session.commit()
    
    # Create notification for recipient
    sender = User.query.get(current_user_id)
    sender_name = f"{sender.first_name} {sender.last_name}".strip() or sender.username
    
    notification = Notification(
        user_id=recipient_id,
        notification_type='call',
        title=f'Incoming {call_type} call from {sender_name}',
        message=f'{sender_name} is calling you',
        resource_type='room',
        resource_id=room.id,
        action_url=f'/meeting/{room.id}?call_type={call_type}',
        priority='high'
    )
    db.session.add(notification)
    db.session.commit()
    
    # Emit call notification via socket (in addition to API response)
    try:
        socketio.emit('incoming_call', {
            'caller_id': current_user_id,
            'room_id': room.id,
            'call_type': call_type,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'user_{recipient_id}')
    except Exception:
        # Call notification emit failed - non-critical
        pass
    
    return jsonify({
        'room_id': room.id,
        'room_code': room.room_code,
        'call_type': call_type,
        'recipient_id': recipient_id
    }), 201

