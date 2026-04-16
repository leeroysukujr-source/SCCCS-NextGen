from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from app import db
from app.models import Room, RoomParticipant, Channel, Message, User
from app.models.notifications import Notification
from datetime import datetime
from app.utils.socket_helpers import deliver_missed_messages, handle_message_ack as helper_handle_message_ack

def register_socketio_events(socketio):
    # Thread-safe storage for socket session data (keyed by request.sid)
    # Since Flask-SocketIO's request context is transient, we use a dict
    # to persist user_id across event handlers for the same socket connection.
    import threading
    socket_data = {}
    socket_data_lock = threading.Lock()
    
    # Helper to read user id for the current socket.
    # Flask request may not preserve attributes across socket event calls,
    # so we check the thread-safe socket_data dict keyed by request.sid.
    def _get_user_id():
        from flask import request
        from app.utils.logger import log_debug
        try:
            uid = None
            sid = getattr(request, 'sid', 'UNKNOWN')
            
            # First try request attribute (set during connect)
            try:
                uid = getattr(request, 'user_id', None)
            except Exception:
                uid = None
            
            # Fallback to socket_data dict keyed by request.sid
            if not uid:
                with socket_data_lock:
                    uid = socket_data.get(sid, {}).get('user_id')
                    if not uid:
                        log_debug(f"_get_user_id: socket {sid} not found in socket_data. Available: {list(socket_data.keys())}")
            return uid
        except Exception as e:
            log_debug(f"_get_user_id exception: {e}")
            return None
    
    def _set_socket_user_id(user_id):
        """Store user_id in socket_data for the current socket."""
        from flask import request
        from app.utils.logger import log_debug
        try:
            sid = getattr(request, 'sid', 'UNKNOWN')
            with socket_data_lock:
                if sid not in socket_data:
                    socket_data[sid] = {}
                socket_data[sid]['user_id'] = user_id
                log_debug(f"_set_socket_user_id: Stored user {user_id} for socket {sid}")
        except Exception as e:
            log_debug(f"_set_socket_user_id exception: {e}")
    
    def _clear_socket_data():
        """Clean up socket_data when socket disconnects."""
        try:
            from flask import request
            with socket_data_lock:
                socket_data.pop(request.sid, None)
        except Exception:
            pass
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle client connection with improved error handling and multiple token retrieval methods"""
        from flask import request
        from app.utils.logger import log_debug, log_warning
        from flask_jwt_extended.exceptions import JWTDecodeError
        from app.utils.logger import log_info, log_error
        
        log_debug(f"Socket connect event triggered - auth type: {type(auth)}, request.sid: {request.sid}")
        
        token = None
        
        # Try multiple methods to get token (Socket.IO v4+ supports auth object)
        # Method 1: From auth dict (Socket.IO v4/v5) - most common
        try:
            if auth:
                if isinstance(auth, dict):
                    token = auth.get('token') or auth.get('access_token') or auth.get('auth')
                elif isinstance(auth, str):
                    token = auth
        except (TypeError, AttributeError):
            pass
        
        # Method 2: From query string parameters
        if not token:
            try:
                token = request.args.get('token') or request.args.get('access_token') or request.args.get('auth')
            except (AttributeError, KeyError):
                pass
        
        # Method 3: From request headers (for polling transport)
        if not token:
            try:
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header[7:].strip()
            except (AttributeError, KeyError):
                pass
        
        # Validate token exists
        if not token:
            # ALLOW connection without token for public system updates (Maintenance Mode)
            # These connections are "GUESTS" and won't be joined to user/workspace rooms.
            log_debug('Socket.IO: [GUEST] connection established (no token)')
            return True
        
        # Validate and decode token
        try:
            decoded = decode_token(token)
            user_id = decoded.get('sub') or decoded.get('identity')
            
            if not user_id:
                return False
            
            # Store user_id in request for later use in other handlers
            try:
                request.user_id = user_id
                # Also persist in socket_data so other events can access it
                _set_socket_user_id(user_id)
            except (AttributeError, TypeError):
                pass
            
            # Join user's personal room for direct messaging
            try:
                join_room(f'user_{user_id}')
            except Exception as e:
                log_warning(f"Socket.IO: Failed to join room for user {user_id}: {str(e)}")
                return False
            
            # Emit connected event (non-blocking, don't fail if emit fails)
            try:
                emit('connected', {'user_id': user_id, 'status': 'connected'}, namespace='/')
            except Exception:
                # Emit failed but connection is still valid
                pass
            
            log_info(f"Socket.IO: user {user_id} connected successfully")
            # Best-effort: deliver missed messages (direct + channel) to this user's personal room
            try:
                deliver_missed_messages(socketio, user_id)
            except Exception:
                pass

            # Join workspace-specific room for real-time branding/settings updates
            try:
                user = User.query.get(user_id)
                if user and user.workspace_id:
                    join_room(f'workspace_{user.workspace_id}')
                    log_info(f"Socket.IO: user {user_id} joined room workspace_{user.workspace_id}")
            except Exception as e:
                log_warning(f"Socket.IO: Failed to join workspace room for user {user_id}: {str(e)}")
            
            return True
        except JWTDecodeError:
            # Invalid token format
            log_warning('Socket.IO: JWT decode error during connect')
            return False
        except Exception as e:
            # Other token validation errors
            log_warning(f"Socket.IO connection: Token validation error: {str(e)}")
            return False

    @socketio.on('ping')
    def handle_ping(data=None):
        """Simple ping/pong for connectivity checks"""
        try:
            emit('pong', {'ok': True})
        except Exception as e:
            try:
                log_error(f"Socket.IO ping handler error: {str(e)}")
            except Exception:
                pass
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        # Clean up socket_data for this socket
        _clear_socket_data()
        # Silent disconnect - no logging needed
        pass
    
    @socketio.on('join_room')
    def handle_join_room(data):
        """Join a video/audio room"""
        try:
            from flask import request
            user_id = _get_user_id()
            if not user_id:
                emit('error', {'message': 'Not authenticated'})
                return
            
            room_id = data.get('room_id')
            room = Room.query.get(room_id)
            
            if not room:
                emit('error', {'message': 'Room not found'})
                return
            
            # Check if user is a participant
            participant = RoomParticipant.query.filter_by(room_id=room_id, user_id=user_id).first()
            if not participant:
                emit('error', {'message': 'Not a participant'})
                return
            
            join_room(f'room_{room_id}')
            emit('joined_room', {'room_id': room_id, 'user_id': user_id})
            
            # Notify others
            socketio.emit('user_joined', {'room_id': room_id, 'user_id': user_id}, room=f'room_{room_id}', skip_sid=request.sid)
        except Exception as e:
            emit('error', {'message': str(e)})
    
    @socketio.on('leave_room')
    def handle_leave_room(data):
        """Leave a video/audio room"""
        try:
            from flask import request
            user_id = _get_user_id()
            room_id = data.get('room_id')
            
            leave_room(f'room_{room_id}')
            emit('left_room', {'room_id': room_id})
            
            # Notify others
            socketio.emit('user_left', {'room_id': room_id, 'user_id': user_id}, room=f'room_{room_id}')
        except Exception as e:
            emit('error', {'message': str(e)})
    
    @socketio.on('new_message')
    def handle_new_message(data):
        """Handle new chat message - emit immediately for real-time"""
        try:
            from flask import request
            user_id = _get_user_id()
            if not user_id:
                emit('error', {'message': 'Not authenticated'})
                return
            
            channel_id = data.get('channel_id')
            content = data.get('content')
            
            if not channel_id:
                emit('error', {'message': 'Missing channel_id'})
                return
            
            # Ensure real-time broadcast is decrypted for the Authorized Stream
            # Check for both base64 (gAAAA) and hex (\x6741) Fernet prefixes
            if content and isinstance(content, str) and (content.startswith('gAAAA') or content.startswith('\\x6741')):
                try:
                    from app.utils.encryption import decrypt_message
                    channel = Channel.query.get(channel_id)
                    decrypted = None
                    if channel and channel.is_encrypted and channel.encryption_key:
                        try:
                            decrypted = decrypt_message(content, channel.encryption_key.encode('utf-8'))
                        except:
                            decrypted = None
                    
                    if not decrypted or decrypted == "[Decryption Error]":
                        try:
                            decrypted = decrypt_message(content) # Master Key Fallback
                        except:
                            pass
                    
                    if decrypted and decrypted != "[Decryption Error]":
                        content = decrypted
                except:
                    pass

            socketio.emit('message_received', {
                'channel_id': channel_id,
                'author_id': user_id,
                'content': content,
                'message_type': data.get('message_type', 'text'),
                'timestamp': datetime.utcnow().isoformat(),
                'is_realtime_broadcast': True # Flag to distinguish from official DB-saved message
            }, room=f'channel_{channel_id}')
        except Exception as e:
            emit('error', {'message': str(e)})
    
    @socketio.on('join_channel')
    def handle_join_channel(data):
        """Join a chat channel"""
        try:
            from flask import request
            user_id = _get_user_id()
            channel_id = data.get('channel_id')
            
            join_room(f'channel_{channel_id}')
            emit('joined_channel', {'channel_id': channel_id})
        except Exception as e:
            emit('error', {'message': str(e)})
    
    @socketio.on('leave_channel')
    def handle_leave_channel(data):
        """Leave a chat channel"""
        try:
            channel_id = data.get('channel_id')
            leave_room(f'channel_{channel_id}')
            emit('left_channel', {'channel_id': channel_id})
        except Exception as e:
            emit('error', {'message': str(e)})
    
    # Direct Call Events
    @socketio.on('initiate_call')
    def handle_initiate_call(data):
        """Initiate a direct call between two users"""
        try:
            from flask import request
            from app.models import DirectMessage, User
            caller_id = _get_user_id()
            if not caller_id:
                emit('error', {'message': 'Not authenticated'})
                return
            
            recipient_id = data.get('recipient_id')
            call_type = data.get('call_type', 'video')  # 'video' or 'audio'
            room_id = data.get('room_id')
            
            if not recipient_id:
                emit('error', {'message': 'Missing recipient_id'})
                return
            
            # Create call notification message in the conversation
            caller = User.query.get(caller_id)
            caller_name = f"{caller.first_name} {caller.last_name}".strip() if caller else "Someone"
            
            # Create call_started message for caller
            call_msg_caller = DirectMessage(
                sender_id=caller_id,
                recipient_id=recipient_id,
                content=f'📞 {call_type.capitalize()} call started',
                message_type='call_started',
                is_encrypted=False,
                call_room_id=room_id,
                call_status='started'
            )
            db.session.add(call_msg_caller)
            
            # Create call_started message for recipient
            call_msg_recipient = DirectMessage(
                sender_id=caller_id,
                recipient_id=recipient_id,
                content=f'📞 Incoming {call_type} call from {caller_name}',
                message_type='call_started',
                is_encrypted=False,
                call_room_id=room_id,
                call_status='started'
            )
            db.session.add(call_msg_recipient)
            db.session.commit()
            
            # Emit the call messages to both users
            socketio.emit('direct_message_received', call_msg_caller.to_dict(), room=f'user_{caller_id}')
            socketio.emit('direct_message_received', call_msg_recipient.to_dict(), room=f'user_{recipient_id}')
            
            # Emit incoming call notification to recipient
            socketio.emit('incoming_call', {
                'caller_id': caller_id,
                'room_id': room_id,
                'call_type': call_type,
                'timestamp': datetime.utcnow().isoformat()
            }, room=f'user_{recipient_id}')
            
            # Emit call_initiated to caller
            emit('call_initiated', {
                'recipient_id': recipient_id,
                'room_id': room_id,
                'call_type': call_type
            })
        except Exception:
            # Error initiating call - emit error silently
            emit('error', {'message': 'Failed to initiate call'})
    
    @socketio.on('accept_call')
    def handle_accept_call(data):
        """Accept an incoming call"""
        try:
            from flask import request
            from app.models import DirectMessage, User
            recipient_id = _get_user_id()
            if not recipient_id:
                emit('error', {'message': 'Not authenticated'})
                return
            
            caller_id = data.get('caller_id')
            room_id = data.get('room_id')
            
            if not caller_id or not room_id:
                emit('error', {'message': 'Missing caller_id or room_id'})
                return
            
            # Create call accepted message
            recipient = User.query.get(recipient_id)
            recipient_name = f"{recipient.first_name} {recipient.last_name}".strip() if recipient else "Someone"
            
            # Update call_started message to call_answered
            call_messages = DirectMessage.query.filter_by(
                call_room_id=room_id,
                message_type='call_started'
            ).all()
            
            for msg in call_messages:
                msg.message_type = 'call_answered'
                msg.call_status = 'answered'
                msg.content = f'✅ {recipient_name} answered the call'
            
            db.session.commit()
            
            # Emit updated messages
            for msg in call_messages:
                socketio.emit('direct_message_received', msg.to_dict(), 
                             room=f'user_{msg.sender_id}')
                socketio.emit('direct_message_received', msg.to_dict(), 
                             room=f'user_{msg.recipient_id}')
            
            # Get call_type from room description or call message
            call_type = 'video'  # Default
            room = Room.query.get(room_id)
            if room:
                # Check room description for call type
                if room.description:
                    if 'video' in room.description.lower():
                        call_type = 'video'
                    elif 'voice' in room.description.lower() or 'audio' in room.description.lower():
                        call_type = 'audio'
                # Also check room name
                elif room.name:
                    if 'video' in room.name.lower():
                        call_type = 'video'
                    elif 'voice' in room.name.lower() or 'audio' in room.name.lower():
                        call_type = 'audio'
            
            # Try to get from DirectMessage if available (more reliable)
            if call_messages:
                # Look for call_started messages with call_type info
                for msg in call_messages:
                    content_lower = msg.content.lower()
                    if 'video call' in content_lower or '📞 video call' in content_lower:
                        call_type = 'video'
                        break
                    elif 'voice call' in content_lower or 'audio call' in content_lower or '📞 voice' in content_lower:
                        call_type = 'audio'
                        break
            
            # Notify caller that call was accepted
            socketio.emit('call_accepted', {
                'recipient_id': recipient_id,
                'room_id': room_id,
                'call_type': call_type
            }, room=f'user_{caller_id}')
            
            # Notify recipient
            emit('call_accepted', {
                'recipient_id': recipient_id,
                'room_id': room_id,
                'call_type': call_type
            })
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error accepting call: {str(e)}")
            emit('error', {'message': str(e)})
    
    @socketio.on('reject_call')
    def handle_reject_call(data):
        """Reject an incoming call"""
        try:
            from flask import request
            from app.models import DirectMessage, User
            recipient_id = _get_user_id()
            if not recipient_id:
                emit('error', {'message': 'Not authenticated'})
                return
            
            caller_id = data.get('caller_id')
            room_id = data.get('room_id')
            
            if not caller_id:
                emit('error', {'message': 'Missing caller_id'})
                return
            
            # Create call rejected/missed messages
            recipient = User.query.get(recipient_id)
            recipient_name = f"{recipient.first_name} {recipient.last_name}".strip() if recipient else "Someone"
            
            # Create missed call message for recipient
            missed_msg = DirectMessage(
                sender_id=caller_id,
                recipient_id=recipient_id,
                content=f'❌ Missed {data.get("call_type", "video")} call',
                message_type='call_missed',
                is_encrypted=False,
                call_room_id=room_id,
                call_status='missed'
            )
            db.session.add(missed_msg)
            
            # Create rejected call message for caller
            rejected_msg = DirectMessage(
                sender_id=caller_id,
                recipient_id=recipient_id,
                content=f'❌ {recipient_name} declined the call',
                message_type='call_missed',
                is_encrypted=False,
                call_room_id=room_id,
                call_status='missed'
            )
            db.session.add(rejected_msg)
            db.session.commit()
            
            # Emit messages
            socketio.emit('direct_message_received', missed_msg.to_dict(), room=f'user_{recipient_id}')
            socketio.emit('direct_message_received', rejected_msg.to_dict(), room=f'user_{caller_id}')
            
            # Notify caller that call was rejected
            socketio.emit('call_rejected', {
                'recipient_id': recipient_id,
                'room_id': room_id
            }, room=f'user_{caller_id}')
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error rejecting call: {str(e)}")
            emit('error', {'message': str(e)})
    
    @socketio.on('end_call')
    def handle_end_call(data):
        """End an ongoing call"""
        try:
            from flask import request
            from app.models import DirectMessage, User, Room
            user_id = _get_user_id()
            if not user_id:
                emit('error', {'message': 'Not authenticated'})
                return
            
            room_id = data.get('room_id')
            other_user_id = data.get('other_user_id')
            call_duration = data.get('call_duration', 0)  # Duration in seconds
            
            # If other_user_id not provided, get from room participants
            if not other_user_id and room_id:
                from app.models import RoomParticipant
                room = Room.query.get(room_id)
                if room:
                    participants = RoomParticipant.query.filter_by(room_id=room_id).all()
                    other_user_id = next((p.user_id for p in participants if p.user_id != user_id), None)
            
            if not other_user_id:
                emit('error', {'message': 'Missing other_user_id'})
                return
            
            # Calculate duration
            user = User.query.get(user_id)
            user_name = f"{user.first_name} {user.last_name}".strip() if user else "Someone"
            
            # Format duration
            if call_duration > 0:
                minutes = call_duration // 60
                seconds = call_duration % 60
                duration_str = f"{minutes:02d}:{seconds:02d}"
            else:
                duration_str = "00:00"
            
            # Create call ended messages
            ended_msg_1 = DirectMessage(
                sender_id=user_id,
                recipient_id=other_user_id,
                content=f'📞 Call ended • Duration: {duration_str}',
                message_type='call_ended',
                is_encrypted=False,
                call_room_id=room_id,
                call_status='ended',
                call_duration=call_duration
            )
            db.session.add(ended_msg_1)
            
            ended_msg_2 = DirectMessage(
                sender_id=user_id,
                recipient_id=other_user_id,
                content=f'📞 Call ended • Duration: {duration_str}',
                message_type='call_ended',
                is_encrypted=False,
                call_room_id=room_id,
                call_status='ended',
                call_duration=call_duration
            )
            db.session.add(ended_msg_2)
            db.session.commit()
            
            # Emit messages
            socketio.emit('direct_message_received', ended_msg_1.to_dict(), room=f'user_{user_id}')
            socketio.emit('direct_message_received', ended_msg_2.to_dict(), room=f'user_{other_user_id}')
            
            # Notify other participant that call ended
            socketio.emit('call_ended', {
                'room_id': room_id,
                'ended_by': user_id,
                'call_duration': call_duration
            }, room=f'user_{other_user_id}')
            
            # Emit to sender as well
            emit('call_ended', {
                'room_id': room_id,
                'ended_by': user_id,
                'call_duration': call_duration
            })
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error ending call: {str(e)}")
            emit('error', {'message': str(e)})
    
    @socketio.on('join_assignment_group')
    def handle_join_assignment_group(data):
        """Join an assignment study room"""
        try:
            from flask import request
            user_id = _get_user_id()
            group_id = data.get('groupId')
            if not group_id or not user_id:
                return
            
            join_room(f'asg_group_{group_id}')
            emit('joined_assignment_group', {'groupId': group_id})
            
            # Notify others
            socketio.emit('asg_user_joined', {
                'groupId': group_id, 
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            }, room=f'asg_group_{group_id}', skip_sid=request.sid)
        except Exception as e:
            emit('error', {'message': str(e)})

    @socketio.on('send_assignment_group_message')
    def handle_send_assignment_group_message(data):
        """Handle new assignment group message"""
        try:
            from flask import request
            from app.models import AssignmentGroupMessage, User
            user_id = _get_user_id()
            group_id = data.get('groupId')
            message_data = data.get('message', {})
            content = message_data.get('text')
            
            if not group_id or not content or not user_id:
                return
            
            # Save to DB
            msg = AssignmentGroupMessage(
                group_id=group_id,
                user_id=user_id,
                content=content,
                message_type='text'
            )
            db.session.add(msg)
            db.session.commit()
            
            # Broadcast to group
            socketio.emit('asg_message_received', msg.to_dict(), room=f'asg_group_{group_id}')
        except Exception as e:
            emit('error', {'message': str(e)})

    @socketio.on('update_assignment_group_task')
    def handle_update_assignment_group_task(data):
        """Broadcast task update to group"""
        group_id = data.get('groupId')
        if not group_id:
            return
        socketio.emit('asg_task_updated', data, room=f'asg_group_{group_id}')

    @socketio.on('typing')
    def handle_typing(data):
        """Handle typing indicator"""
        try:
            from flask import request
            from app.models import User
            user_id = _get_user_id()
            channel_id = data.get('channel_id')
            
            if user_id:
                user = User.query.get(user_id)
                user_name = data.get('user_name') or (user.first_name if user else 'Someone')
                
                socketio.emit('user_typing', {
                    'user_id': user_id,
                    'user_name': user_name,
                    'channel_id': channel_id
                }, room=f'channel_{channel_id}', skip_sid=request.sid)
        except Exception as e:
            pass  # Ignore typing errors
    
    @socketio.on('react_to_message')
    def handle_react_to_message(data):
        """Handle message reaction"""
        try:
            from flask import request
            user_id = _get_user_id()
            message_id = data.get('message_id')
            emoji = data.get('emoji')
            channel_id = data.get('channel_id')
            
            if not user_id or not message_id:
                return
            
            # Get message to find channel_id
            message = Message.query.get(message_id)
            if not message:
                return
            
            channel_id = message.channel_id
            
            # Emit reaction to channel (storage would be handled by API)
            socketio.emit('message_reaction', {
                'message_id': message_id,
                'emoji': emoji,
                'user_id': user_id,
                'channel_id': channel_id
            }, room=f'channel_{channel_id}')
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error handling reaction: {str(e)}")
    
    @socketio.on('delete_message')
    def handle_delete_message(data):
        """Handle message deletion"""
        try:
            from flask import request
            user_id = _get_user_id()
            message_id = data.get('message_id')
            channel_id = data.get('channel_id')
            
            if not user_id or not message_id:
                return
            
            # Get message to verify ownership and get channel_id
            message = Message.query.get(message_id)
            if not message:
                return
            
            # Only author can delete
            if message.author_id != user_id:
                emit('error', {'message': 'Unauthorized'})
                return
            
            channel_id = message.channel_id
            
            # Emit deletion to channel
            socketio.emit('message_deleted', {
                'message_id': message_id,
                'channel_id': channel_id,
                'user_id': user_id
            }, room=f'channel_{channel_id}')
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error handling delete: {str(e)}")
    
    @socketio.on('mark_message_read')
    def handle_mark_read(data):
        """Handle read receipt"""
        try:
            from flask import request
            user_id = _get_user_id()
            message_id = data.get('message_id')
            channel_id = data.get('channel_id')
            
            if not user_id:
                return
            
            # Update last_read_at for channel member
            if channel_id:
                from app.models import ChannelMember
                member = ChannelMember.query.filter_by(
                    channel_id=channel_id,
                    user_id=user_id
                ).first()
                
                if member:
                    member.last_read_at = datetime.utcnow()
                    db.session.commit()
                
                # Emit read receipt
                socketio.emit('message_read', {
                    'message_id': message_id,
                    'user_id': user_id,
                    'channel_id': channel_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f'channel_{channel_id}')
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error handling read receipt: {str(e)}")

    @socketio.on('message_ack')
    def handle_message_ack(data):
        """Handle delivery acknowledgement from clients (best-effort).

        Clients should emit `message_ack` after receiving `message_received`.
        We delegate to helper_handle_message_ack to update read/delivery metadata.
        """
        try:
            from flask import request
            user_id = _get_user_id()
            if not user_id:
                return

            success = False
            try:
                success = helper_handle_message_ack(user_id, data)
            except Exception:
                success = False

            if success:
                # Optionally emit a delivery confirmation to the author (best-effort)
                try:
                    message_id = data.get('message_id')
                    channel_id = data.get('channel_id')
                    # Notify author that user has received the message
                    socketio.emit('message_delivered', {
                        'message_id': message_id,
                        'user_id': user_id,
                        'channel_id': channel_id,
                        'delivered_at': datetime.utcnow().isoformat()
                    }, room=f'user_{data.get("author_id")}' if data.get('author_id') else None)
                except Exception:
                    pass
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error handling message_ack: {str(e)}")

    # Meeting chat events
    @socketio.on('join_meeting_room')
    def handle_join_meeting_room(data):
        """Join a meeting room for chat"""
        try:
            from flask import request
            from app.models import User
            from app.utils.logger import log_debug, log_info
            user_id = _get_user_id()
            room_id = data.get('room_id')
            
            log_debug(f"join_meeting_room: user_id={user_id}, room_id={room_id}, request.sid={request.sid}")
            
            if not user_id:
                log_debug(f"join_meeting_room: User not authenticated, socket_data keys: {list(socket_data.keys())}")
                emit('error', {'message': 'Not authenticated'})
                return
            
            log_info(f"join_meeting_room: user {user_id} joining meeting {room_id}")
            
            room = Room.query.get(room_id)
            if not room:
                emit('error', {'message': 'Room not found'})
                return
            
            # Check if user is a participant or host
            participant = RoomParticipant.query.filter_by(room_id=room_id, user_id=user_id).first()
            is_host = room.host_id == user_id
            
            # If not a participant and not host, auto-add them as participant
            # (allows users to join via link/code)
            if not participant and not is_host:
                try:
                    participant = RoomParticipant(room_id=room_id, user_id=user_id)
                    db.session.add(participant)
                    db.session.commit()
                    log_info(f"join_meeting_room: Auto-added user {user_id} as participant to room {room_id}")
                except Exception as e:
                    log_debug(f"join_meeting_room: Failed to auto-add participant: {e}")
                    # Continue anyway - they can still participate via socket
            
            join_room(f'meeting_{room_id}')
            emit('joined_meeting_room', {'room_id': room_id})
            
            # Notify others
            user = User.query.get(user_id)
            socketio.emit('meeting_participant_joined', {
                'room_id': room_id,
                'user_id': user_id,
                'username': user.username if user else 'Guest',
                'first_name': user.first_name if user else None
            }, room=f'meeting_{room_id}', skip_sid=request.sid)
        except Exception as e:
            emit('error', {'message': str(e)})
    
    @socketio.on('meeting_message')
    def handle_meeting_message(data):
        """Handle meeting chat message"""
        try:
            from flask import request
            from app.models import User
            user_id = _get_user_id()
            room_id = data.get('room_id')
            content = data.get('content')
            
            if not user_id or not room_id or not content:
                emit('error', {'message': 'Missing required fields'}, callback=lambda ack: ack({'error': 'Missing required fields'}))
                return
            
            # Validate content length
            if len(content) > 5000:  # Max 5000 characters
                emit('error', {'message': 'Message too long'}, callback=lambda ack: ack({'error': 'Message too long'}))
                return
            
            room = Room.query.get(room_id)
            if not room:
                emit('error', {'message': 'Room not found'}, callback=lambda ack: ack({'error': 'Room not found'}))
                return
            
            # Verify user is participant or host
            # For meeting chat, allow anyone who has joined the socket room to send messages
            # This allows students/guests who are in the meeting to chat
            participant = RoomParticipant.query.filter_by(room_id=room_id, user_id=user_id).first()
            is_host = room.host_id == user_id
            
            # If not a participant and not host, try to add them as participant (for guests/students)
            if not participant and not is_host:
                # Allow them to send messages anyway if room is active
                # The socket room membership is sufficient for chat
                if not room.is_active:
                    emit('error', {'message': 'Room is not active'}, callback=lambda ack: ack({'error': 'Room is not active'}))
                    return
                # Log but allow - they're already in the socket room
                # User sending message without being in participant table (allowed for meeting chat)
                pass
            
            user = User.query.get(user_id)
            
            # Broadcast message to all meeting participants with acknowledgment
            message_data = {
                'room_id': room_id,
                'user_id': user_id,
                'username': user.username if user else data.get('username', 'Guest'),
                'first_name': user.first_name if user else None,
                'role': user.role if user else None,
                'content': content,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Broadcast to all in the meeting room (including sender - they'll handle deduplication)
            socketio.emit('meeting_message', message_data, room=f'meeting_{room_id}')
            
            # Send acknowledgment back to sender
            emit('message_sent', {'success': True})
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error handling meeting message: {str(e)}")
            emit('error', {'message': str(e)}, callback=lambda ack: ack({'error': str(e)}))
    
    @socketio.on('leave_meeting_room')
    def handle_leave_meeting_room(data):
        """Leave a meeting room"""
        try:
            from flask import request
            from app.models import User
            user_id = _get_user_id()
            room_id = data.get('room_id')
            
            if not room_id:
                return
            
            leave_room(f'meeting_{room_id}')
            emit('left_meeting_room', {'room_id': room_id})
            
            # Notify others if user was authenticated
            if user_id:
                user = User.query.get(user_id)
                socketio.emit('meeting_participant_left', {
                    'room_id': room_id,
                    'user_id': user_id,
                    'username': user.username if user else 'Guest'
                }, room=f'meeting_{room_id}', skip_sid=request.sid)
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error handling leave meeting room: {str(e)}")
            # Don't emit error on leave - just log it
    
    # Direct message events
    @socketio.on('typing_dm')
    def handle_typing_dm(data):
        """Handle typing indicator for direct messages"""
        try:
            from flask import request
            from app.models import User
            user_id = _get_user_id()
            recipient_id = data.get('recipient_id')
            
            if user_id and recipient_id:
                user = User.query.get(user_id)
                user_name = data.get('user_name') or (user.first_name if user else 'Someone')
                
                socketio.emit('user_typing_dm', {
                    'user_id': user_id,
                    'user_name': user_name,
                    'recipient_id': recipient_id
                }, room=f'user_{recipient_id}')
        except Exception as e:
            pass  # Ignore typing errors

    @socketio.on('message_ack')
    def handle_message_ack_event(data):
        """Client acknowledges message receipt. Marks DM as read or updates channel last_read."""
        try:
            from flask import request
            user_id = _get_user_id()
            if not user_id:
                emit('message_ack_result', {'success': False, 'error': 'Not authenticated'})
                return

            success = helper_handle_message_ack(user_id, data or {})
            emit('message_ack_result', {'success': bool(success)})
        except Exception:
            try:
                emit('message_ack_result', {'success': False})
            except Exception:
                pass

    @socketio.on('join_group_room')
    def handle_join_group_room(data):
        """Join a study group room for presence/chat"""
        try:
            from flask import request
            from app.models import User
            user_id = _get_user_id()
            group_id = data.get('groupId') or data.get('group_id')
            
            if not user_id or not group_id:
                return

            join_room(f'group_{group_id}')
            
            # Get user info
            user = User.query.get(user_id)
            user_info = {
                'id': user_id, 
                'username': user.username, 
                'avatar': user.profile_image if hasattr(user, 'profile_image') else None
            } if user else {'id': user_id, 'username': 'Unknown'}
            
            # Broadcast join to others
            socketio.emit('group_user_joined', user_info, room=f'group_{group_id}')
            
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error joining group room: {str(e)}")

    @socketio.on('leave_group_room')
    def handle_leave_group_room(data):
        try:
            from flask import request
            user_id = _get_user_id()
            group_id = data.get('groupId') or data.get('group_id')
            
            leave_room(f'group_{group_id}')
            if user_id:
                socketio.emit('group_user_left', {'id': user_id}, room=f'group_{group_id}')
        except Exception:
            pass

    @socketio.on('send_group_message')
    def handle_send_group_message(data):
        try:
            from app.models import GroupMessage, User
            from app import db
            from flask import request
            
            user_id = _get_user_id()
            group_id = data.get('groupId')
            msg_data = data.get('message', {})
            content = msg_data.get('text')
            
            if not user_id or not group_id or not content:
                return

            # Save to DB
            message = GroupMessage(
                group_id=group_id,
                user_id=user_id,
                content=content,
                message_type='text'
            )
            db.session.add(message)
            db.session.commit()
            
            # Get user for consistent name
            user = User.query.get(user_id)
            username = user.username if user else 'Unknown'

            # Construct payload compatible with frontend
            payload = {
                'id': message.id,
                'user': username,
                'text': message.content,
                'time': message.created_at.strftime('%I:%M %p'), # Format time for display
                'senderId': user_id,
                'is_persisted': True
            }

            # Broadcast to everyone ELSE
            socketio.emit('group_message', payload, room=f'group_{group_id}', skip_sid=request.sid)
        except Exception as e:
            from app.utils.logger import log_error
            log_error(f"Error sending group message: {str(e)}")
            
    @socketio.on('start_group_live')
    def handle_start_group_live(data):
        try:
            from app.models import User
            user_id = _get_user_id()
            group_id = data.get('groupId')
            room_id = data.get('roomId') # LiveKit room ID
            
            user = User.query.get(user_id)
            username = user.username if user else "A member"
            
            socketio.emit('group_live_started', {
                'groupId': group_id,
                'roomId': room_id,
                'startedBy': user_id,
                'startedByName': username
            }, room=f'group_{group_id}')
        except Exception:
            pass

    # --- Collaboration Listener (SmartDoc Synchronization) ---
    # Instruction: Ensure you have a separate socketio or y-websocket instance 
    # running on the /collab namespace to handle the SmartDoc synchronization.

    @socketio.on('connect', namespace='/collab')
    def handle_collab_connect(auth=None):
        """Allow collaboration connection and join document-specific room"""
        from flask import request
        from app.utils.logger import log_info
        
        room = request.args.get('room')
        if room:
            join_room(room)
            log_info(f"Collab: Socket {request.sid} joined document room: {room}")
        return True

    @socketio.on('message', namespace='/collab')
    def handle_collab_message(data):
        """
        Binary Relay for Yjs/SmartDoc collaboration.
        Accepts binary sync steps and broadcasts to all other collaborators in the room.
        """
        from flask import request
        room = request.args.get('room')
        
        # Broadcast the binary data (data) as-is to ensure perfect synchronization
        if room:
            socketio.emit('message', data, room=room, namespace='/collab', include_self=False)
        else:
            # Fallback to global broadcast if room is not specified in handshake
            socketio.emit('message', data, namespace='/collab', include_self=False)

    @socketio.on('disconnect', namespace='/collab')
    def handle_collab_disconnect():
        """Clean up collab presence"""
        pass
