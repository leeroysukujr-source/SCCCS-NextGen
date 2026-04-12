from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Room, RoomParticipant, User
from app.utils.scoping import scope_query, get_current_workspace_id
from config import Config
from datetime import datetime
import secrets
import string
from app.utils.middleware import feature_required

rooms_bp = Blueprint('rooms', __name__)

@rooms_bp.before_request
@feature_required('video_room')
def check_rooms_enabled():
    pass

def generate_room_code():
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

def can_create_meeting(user):
    """Check if user has permission to create meetings"""
    return user.role in ['admin', 'teacher'] or user.role == 'student'  # All users can create for now

@rooms_bp.route('', methods=['POST'])
@jwt_required()
def create_room():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check permissions
    if not can_create_meeting(user):
        return jsonify({'error': 'You do not have permission to create meetings'}), 403
    
    data = request.get_json()
    meeting_type = data.get('meeting_type', 'instant')
    scheduled_at = data.get('scheduled_at')
    
    # Validate scheduled meeting
    if meeting_type == 'scheduled':
        if not scheduled_at:
            return jsonify({'error': 'scheduled_at is required for scheduled meetings'}), 400
        try:
            scheduled_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
            if scheduled_at < datetime.utcnow():
                return jsonify({'error': 'Scheduled time must be in the future'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid scheduled_at format'}), 400
    else:
        scheduled_at = None
    
    room_code = generate_room_code()
    while Room.query.filter_by(room_code=room_code).first():
        room_code = generate_room_code()
    
    # Determine meeting type and name
    meeting_type_value = data.get('meeting_type', meeting_type)
    
    # Get feature config for runtime limits
    from app.services.feature_flags import get_feature_config
    feature_config = get_feature_config('video_room', user.workspace_id)
    
    duration_minutes = data.get('duration_minutes', 60)
    if meeting_type_value == 'direct':
        room_name = data.get('name', 'Direct Call')
        max_participants = 2
        meeting_type_value = 'direct'
    else:
        room_name = data.get('name', 'New Meeting')
        # Respect global/workspace capacity limits from Feature Lab
        max_limit = feature_config.get('max_participants', 50)
        requested_limit = data.get('max_participants', max_limit)
        max_participants = min(requested_limit, max_limit)
        meeting_type_value = data.get('meeting_type', meeting_type)
    channel_id = data.get('channel_id')
    
    # Jurisdiction: Inherit privacy from channel
    if channel_id:
        from app.models import Channel
        channel = Channel.query.get(channel_id)
        if channel and channel.workspace_id == user.workspace_id:
            # If channel is private, force the room to be restricted or direct
            if channel.type == 'private':
                meeting_type_value = 'direct' # Or a new 'restricted' type
    
    room = Room(
        name=room_name,
        description=data.get('description', ''),
        host_id=current_user_id,
        room_code=room_code,
        max_participants=max_participants,
        duration_minutes=duration_minutes,
        meeting_type=meeting_type_value,
        scheduled_at=scheduled_at,
        channel_id=channel_id,
        workspace_id=user.workspace_id or get_current_workspace_id()
    )
    
    db.session.add(room)
    db.session.commit()
    
    # Add host as participant
    participant = RoomParticipant(room_id=room.id, user_id=current_user_id)
    db.session.add(participant)
    
    # Add additional participants if provided (for direct calls)
    if data.get('participants'):
        for participant_id in data.get('participants', []):
            if participant_id != current_user_id:
                # Check if participant user exists
                participant_user = User.query.get(participant_id)
                if participant_user:
                    # Check if already a participant (shouldn't happen, but check anyway)
                    existing = RoomParticipant.query.filter_by(
                        room_id=room.id,
                        user_id=participant_id
                    ).first()
                    if not existing:
                        participant_obj = RoomParticipant(room_id=room.id, user_id=participant_id)
                        db.session.add(participant_obj)
    
    db.session.commit()
    
    return jsonify(room.to_dict()), 201

@rooms_bp.route('', methods=['GET'])
@jwt_required()
def get_rooms():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Admins can see ALL rooms in their workspace
        if user and user.role == 'admin':
            all_rooms = scope_query(Room.query, Room).order_by(Room.created_at.desc()).all()
            return jsonify([room.to_dict() for room in all_rooms]), 200
        
        # Regular users:
        # 1. Workspace Isolation: Handled by scope_query (mostly)
        # 2. Jurisdictional Filtering:
        #    - Show rooms the user is a host or participant of
        #    - Show public rooms in their workspace
        #    - Show rooms linked to channels/courses they are enrolled in
        
        from app.models import ChannelMember, ClassMember
        user_channel_ids = [m.channel_id for m in ChannelMember.query.filter_by(user_id=user.id).all()]
        user_course_ids = [m.class_id for m in ClassMember.query.filter_by(user_id=user.id).all()]
        
        participant_rooms = scope_query(Room.query, Room).filter(
            db.or_(
                Room.host_id == current_user_id,
                Room.participants.any(user_id=current_user_id),
                Room.meeting_type == 'public', # Explicitly public
                Room.channel_id.in_(user_channel_ids), # Enrolled in channel
                db.and_(
                    Room.meeting_type != 'direct',
                    Room.channel_id == None
                ) # Default public rooms (not direct)
            )
        ).order_by(Room.created_at.desc()).all()
        
        return jsonify([room.to_dict() for room in participant_rooms]), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error in get_rooms: {e}")
        return jsonify({'error': f'Failed to fetch rooms: {str(e)}'}), 500

@rooms_bp.route('/<int:room_id>', methods=['GET'])
@jwt_required()
def get_room(room_id):
    room = scope_query(Room.query, Room).filter_by(id=room_id).first()
    
    if not room:
        return jsonify({'error': 'Room not found or access denied'}), 404
    
    return jsonify(room.to_dict()), 200

@rooms_bp.route('/join/<room_code>', methods=['POST'])
@jwt_required()
def join_room(room_code):
    current_user_id = get_jwt_identity()
    room = scope_query(Room.query, Room).filter_by(room_code=room_code).first()
    
    if not room:
        return jsonify({'error': 'Room not found or access denied'}), 404
    
    if not room.is_active:
        return jsonify({'error': 'Room is not active'}), 400
        
    # Check meeting duration expiry
    if room.started_at and room.duration_minutes:
        elapsed = datetime.utcnow() - room.started_at
        elapsed_minutes = elapsed.total_seconds() / 60
        if elapsed_minutes > room.duration_minutes:
            room.is_active = False
            room.ended_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'error': 'Meeting has ended due to time limit'}), 400
    
    # Check if already a participant
    existing = RoomParticipant.query.filter_by(room_id=room.id, user_id=current_user_id).first()
    if existing:
        return jsonify(room.to_dict()), 200
    
    # Check max participants
    if room.participants.count() >= room.max_participants:
        return jsonify({'error': 'Room is full'}), 400
    
    participant = RoomParticipant(room_id=room.id, user_id=current_user_id)
    db.session.add(participant)
    db.session.commit()
    
    return jsonify(room.to_dict()), 200

@rooms_bp.route('/<int:room_id>/leave', methods=['POST'])
@jwt_required()
def leave_room(room_id):
    current_user_id = get_jwt_identity()
    
    participant = RoomParticipant.query.filter_by(room_id=room_id, user_id=current_user_id).first()
    
    if not participant:
        return jsonify({'error': 'Not a participant'}), 404
    
    db.session.delete(participant)
    db.session.commit()
    
    return jsonify({'message': 'Left room successfully'}), 200

@rooms_bp.route('/<int:room_id>/participants', methods=['GET'])
@jwt_required()
def get_room_participants(room_id):
    room = scope_query(Room.query, Room).filter_by(id=room_id).first()
    
    if not room:
        return jsonify({'error': 'Room not found or access denied'}), 404
    
    participants = RoomParticipant.query.filter_by(room_id=room_id).all()
    users = [User.query.get(p.user_id) for p in participants]
    
    return jsonify([user.to_dict() for user in users if user]), 200

@rooms_bp.route('/join/<room_code>', methods=['GET'])
def get_room_by_code(room_code):
    """Get room info by code (for shareable links) - PUBLIC ACCESS"""
    room = Room.query.filter_by(room_code=room_code).first()
    
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    
    if not room.is_active:
        return jsonify({'error': 'Room is not active'}), 400
    
    return jsonify(room.to_dict()), 200

@rooms_bp.route('/public/join/<room_code>', methods=['POST'])
def public_join_room(room_code):
    """Public join room endpoint - allows guests to join"""
    data = request.get_json() or {}
    guest_name = data.get('guest_name', 'Guest')
    
    room = Room.query.filter_by(room_code=room_code).first()
    
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    
    if not room.is_active:
        return jsonify({'error': 'Room is not active'}), 400
    
    # Check max participants (excluding guest users for now)
    participant_count = RoomParticipant.query.filter_by(room_id=room.id).count()
    if participant_count >= room.max_participants:
        return jsonify({'error': 'Room is full'}), 400
    
    # For guest users, we'll allow them to join but they won't be in the database
    # They'll be identified by a session ID or temporary ID
    return jsonify({
        'room': room.to_dict(),
        'guest_name': guest_name,
        'is_guest': True,
        'message': 'You can join as a guest'
    }), 200

@rooms_bp.route('/public/<int:room_id>', methods=['GET'])
def get_public_room(room_id):
    """Get room info by ID - PUBLIC ACCESS for shareable links"""
    room = Room.query.get(room_id)
    
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    
    if not room.is_active:
        return jsonify({'error': 'Room is not active'}), 400
    
    return jsonify(room.to_dict()), 200

@rooms_bp.route('/<int:room_id>/link', methods=['GET'])
@jwt_required()
def get_meeting_link(room_id):
    """Get shareable meeting link"""
    current_user_id = get_jwt_identity()
    room = scope_query(Room.query, Room).filter_by(id=room_id).first()
    
    if not room:
        return jsonify({'error': 'Room not found or access denied'}), 404
    
    # Check if user is host or participant
    is_participant = RoomParticipant.query.filter_by(room_id=room_id, user_id=current_user_id).first()
    if not is_participant and room.host_id != current_user_id:
        return jsonify({'error': 'You do not have access to this meeting'}), 403
    
    # Get frontend URL from config or request
    frontend_url = Config.FRONTEND_URL or request.host_url.rstrip('/')
    if not frontend_url.startswith('http'):
        frontend_url = f"http://{frontend_url}"
    
    # Remove /api if present in frontend_url
    if frontend_url.endswith('/api'):
        frontend_url = frontend_url[:-4]
    
    return jsonify({
        'meeting_link': f"{frontend_url}/meeting/{room.id}",
        'share_link': f"{frontend_url}/join/{room.room_code}",
        'room_code': room.room_code,
        'room_name': room.name
    }), 200

@rooms_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_rooms():
    """Get all rooms - Admin only"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    rooms = scope_query(Room.query, Room).order_by(Room.created_at.desc()).all()
    return jsonify([room.to_dict() for room in rooms]), 200

@rooms_bp.route('/<int:room_id>', methods=['DELETE'])
@jwt_required()
def delete_room(room_id):
    """Delete a room - Admin only or room host"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    room = scope_query(Room.query, Room).filter_by(id=room_id).first()
    
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    
    # Check if user is admin or room host
    if user.role != 'admin' and room.host_id != current_user_id:
        return jsonify({'error': 'You do not have permission to delete this room'}), 403
    
    # Delete all participants first (cascade should handle this, but explicit is safer)
    RoomParticipant.query.filter_by(room_id=room_id).delete()
    
    # Delete the room
    db.session.delete(room)
    db.session.commit()
    
    return jsonify({'message': 'Room deleted successfully'}), 200

import json

# Breakout Room Management
@rooms_bp.route('/<int:room_id>/breakout', methods=['POST'])
@jwt_required()
def create_breakout_rooms(room_id):
    """Create multiple breakout rooms for a main room"""
    current_user_id = get_jwt_identity()
    main_room = Room.query.get_or_404(room_id)
    
    user = User.query.get(current_user_id)
    if main_room.host_id != current_user_id and user.role != 'super_admin':
        return jsonify({'error': 'Only host or admin can create breakout rooms'}), 403
        
    data = request.get_json()
    num_rooms = data.get('num_rooms', 1)
    # Ensure num_rooms is within reasonable limits
    num_rooms = max(1, min(num_rooms, 20))
    
    breakout_rooms = []
    for i in range(num_rooms):
        room_code = generate_room_code()
        while Room.query.filter_by(room_code=room_code).first():
            room_code = generate_room_code()
            
        b_room = Room(
            name=f"{main_room.name} - Breakout {i+1}",
            host_id=main_room.host_id,
            room_code=room_code,
            parent_id=main_room.id,
            is_breakout=True,
            workspace_id=main_room.workspace_id,
            is_active=True,
            max_participants=main_room.max_participants
        )
        db.session.add(b_room)
        breakout_rooms.append(b_room)
        
    main_room.breakout_status = 'not_started'
    db.session.commit()
    
    return jsonify({
        'message': f'Created {num_rooms} breakout rooms',
        'rooms': [r.to_dict() for r in breakout_rooms]
    }), 201

@rooms_bp.route('/<int:room_id>/breakout/open', methods=['POST'])
@jwt_required()
def open_breakout_rooms(room_id):
    """Activate breakout session"""
    current_user_id = get_jwt_identity()
    main_room = Room.query.get_or_404(room_id)
    
    user = User.query.get(current_user_id)
    if main_room.host_id != current_user_id and user.role != 'super_admin':
        return jsonify({'error': 'Only host or admin can open breakout rooms'}), 403
        
    data = request.get_json()
    main_room.breakout_status = 'active'
    main_room.breakout_config = json.dumps(data.get('config', {}))
    db.session.commit()
    
    return jsonify({'message': 'Breakout rooms are now active', 'status': 'active'}), 200

@rooms_bp.route('/<int:room_id>/breakout/close', methods=['POST'])
@jwt_required()
def close_breakout_rooms(room_id):
    """Deactivate breakout session"""
    current_user_id = get_jwt_identity()
    main_room = Room.query.get_or_404(room_id)
    
    user = User.query.get(current_user_id)
    if main_room.host_id != current_user_id and user.role != 'super_admin':
        return jsonify({'error': 'Only host or admin can close breakout rooms'}), 403
        
    main_room.breakout_status = 'closed'
    db.session.commit()
    
    return jsonify({'message': 'Breakout rooms are now closed', 'status': 'closed'}), 200

@rooms_bp.route('/<int:room_id>/breakout/assign', methods=['POST'])
@jwt_required()
def assign_breakout_participants(room_id):
    """Assign participants to specific breakout rooms"""
    current_user_id = get_jwt_identity()
    main_room = Room.query.get_or_404(room_id)
    
    user = User.query.get(current_user_id)
    if main_room.host_id != current_user_id and user.role != 'super_admin':
        return jsonify({'error': 'Only host or admin can assign participants'}), 403
        
    data = request.get_json()
    assignments = data.get('assignments', {}) # {user_id: breakout_room_id}
    
    # In a real implementation, we might want to store this in a separate table
    # or update the breakout_config. For now, we'll store it in breakout_config.
    config = json.loads(main_room.breakout_config) if main_room.breakout_config else {}
    config['assignments'] = assignments
    main_room.breakout_config = json.dumps(config)
    db.session.commit()
    
    return jsonify({'message': 'Assignments updated', 'config': config}), 200

@rooms_bp.route('/<int:room_id>/lock', methods=['POST'])
@jwt_required()
def toggle_room_lock(room_id):
    """Lock or unlock a room to prevent new joins"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    room = Room.query.get_or_404(room_id)
    
    if room.host_id != current_user_id and user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    room.is_locked = data.get('is_locked', True)
    db.session.commit()
    
    return jsonify({'message': f"Room {'locked' if room.is_locked else 'unlocked'}", 'is_locked': room.is_locked}), 200

@rooms_bp.route('/<int:room_id>/kick', methods=['POST'])
@jwt_required()
def kick_participant(room_id):
    """Kick a participant from the room"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    room = Room.query.get_or_404(room_id)
    
    if room.host_id != current_user_id and user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    target_user_id_val = data.get('user_id')
    
    if not target_user_id_val:
        return jsonify({'error': 'Missing user_id'}), 400
        
    if str(target_user_id_val) == str(room.host_id):
        return jsonify({'error': 'Cannot kick host'}), 403
        
    # Find participant in current room
    participant = RoomParticipant.query.filter_by(room_id=room_id, user_id=target_user_id_val, left_at=None).first()
    if participant:
        participant.left_at = datetime.utcnow()
        db.session.commit()
        
    return jsonify({'message': 'Participant kicked'}), 200
