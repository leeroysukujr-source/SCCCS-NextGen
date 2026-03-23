
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.livekit_service import get_livekit_service
from app.models import User, Room
from app import db

meeting_livekit_bp = Blueprint('meeting_livekit', __name__)

from flask_cors import cross_origin




@meeting_livekit_bp.route('/token', methods=['POST'])
@jwt_required(optional=True)
def get_token():
    """
    Get a LiveKit token for joining a room.
    Body: { "room_id": "123", "guest_name": "Optional Guest" }
    """
    import uuid
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id) if user_id else None

    data = request.get_json() or {}
    room_id = data.get('room_id')
    guest_name = data.get('guest_name', '').strip()
    
    if not room_id:
        return jsonify({"error": "room_id is required"}), 400
        
    room_name = str(room_id)
    room_obj = None
    
    # Optional: Look up the room if the ID is purely numerical or might map to our Room model
    try:
        if str(room_id).isdigit():
            room = Room.query.get(int(room_id))
            if room:
                room_obj = room
                room_name = f"room-{room.id}"
                
                # Automatically reactivate the room if it was inactive, ensuring they can join
                if not room.is_active:
                    room.is_active = True
                    db.session.commit()
                    
                from datetime import datetime
                if not room.started_at:
                    room.started_at = datetime.utcnow()
                    db.session.commit()
    except Exception:
        pass
    
    lk_service = get_livekit_service()
    
    is_admin = False
    
    if user:
        is_admin = user.role in ['admin', 'teacher', 'super_admin']
        participant_name = (f"{user.first_name or ''} {user.last_name or ''}".strip()) or user.username
        participant_identity = str(user.id)
    else:
        participant_name = guest_name if guest_name else f"Guest {uuid.uuid4().hex[:4]}"
        participant_identity = f"guest-{uuid.uuid4().hex}"

    try:
        token = lk_service.create_token(
            room_name=room_name,
            participant_identity=participant_identity,
            participant_name=participant_name,
            is_admin=is_admin
        )
    except Exception as e:
        current_app.logger.exception('Failed to create LiveKit token')
        return jsonify({
            'success': False,
            'error': 'LiveKit token generation failed',
            'details': str(e)
        }), 500

    return jsonify({
        "token": token,
        # Return a browser-accessible websocket URL for LiveKit (ws:// or wss://)
        "url": lk_service.get_public_host(request),
        "room": room_name,
        "started_at": room_obj.started_at.isoformat() if room_obj and room_obj.started_at else None,
        "duration_minutes": getattr(room_obj, 'duration_minutes', None) if room_obj else None
    })


@meeting_livekit_bp.route('/start-recording', methods=['POST'])
@jwt_required()
def start_recording():
    """
    Start recording a room (requires LiveKit server with recording enabled).
    Body: { "room_id": "123" }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ['admin', 'teacher', 'super_admin']:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    room_id = data.get('room_id')
    room_name = f"room-{room_id}"

    lk_service = get_livekit_service()
    try:
        # LiveKit Egress API: start recording (if enabled on server)
        result = lk_service.start_recording(room_name)
        return jsonify({"success": True, "egress_id": result.get("egress_id", "unknown")}), 200
    except Exception as e:
        current_app.logger.exception('Failed to start recording')
        return jsonify({"error": str(e)}), 500


@meeting_livekit_bp.route('/stop-recording', methods=['POST'])
@cross_origin()
@jwt_required()
def stop_recording():
    """
    Stop recording a room.
    Body: { "room_id": "123" }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ['admin', 'teacher', 'super_admin']:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    room_id = data.get('room_id')
    room_name = f"room-{room_id}"

    lk_service = get_livekit_service()
    try:
        result = lk_service.stop_recording(room_name)
        return jsonify({"success": True, "result": result}), 200
    except Exception as e:
        current_app.logger.exception('Failed to stop recording')
        return jsonify({"error": str(e)}), 500


@meeting_livekit_bp.route('/remote-mute', methods=['POST'])
@cross_origin()
@jwt_required()
def remote_mute():
    """
    Remote mute a participant's audio.
    Body: { "room_id": "123", "participant_id": "user_id" }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ['admin', 'teacher', 'super_admin']:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    room_id = data.get('room_id')
    participant_id = data.get('participant_id')
    room_name = f"room-{room_id}"

    lk_service = get_livekit_service()
    try:
        result = lk_service.remote_mute_participant(room_name, participant_id, audio=True)
        return jsonify({"success": True, "result": result}), 200
    except Exception as e:
        current_app.logger.exception('Failed to remote mute')
        return jsonify({"error": str(e)}), 500


@meeting_livekit_bp.route('/remove-participant', methods=['POST'])
@cross_origin()
@jwt_required()
def remove_participant():
    """
    Remove a participant from the room.
    Body: { "room_id": "123", "participant_id": "user_id" }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ['admin', 'teacher', 'super_admin']:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    room_id = data.get('room_id')
    participant_id = data.get('participant_id')
    room_name = f"room-{room_id}"

    lk_service = get_livekit_service()
    try:
        result = lk_service.remove_participant(room_name, participant_id)
        return jsonify({"success": True, "result": result}), 200
    except Exception as e:
        current_app.logger.exception('Failed to remove participant')
        return jsonify({"error": str(e)}), 500

