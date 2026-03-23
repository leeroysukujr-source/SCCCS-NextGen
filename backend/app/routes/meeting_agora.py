
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.agora_service import get_agora_service
from app.models import User
from flask_cors import cross_origin

meeting_agora_bp = Blueprint('meeting_agora', __name__)

@meeting_agora_bp.route('/token', methods=['POST'])
@jwt_required()
def get_token():
    """
    Get an Agora token for joining a room.
    Body: { "room_id": "123" }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    room_id = data.get('room_id')
    if not room_id:
        return jsonify({"error": "room_id is required"}), 400
    
    # room_id might be a UUID or string. Agora channels are strings.
    channel_name = f"room-{room_id}"
    
    agora_service = get_agora_service()
    
    # Use user.id (string/int) as the unique identify for Agora
    token = agora_service.create_token(
        channel_name=channel_name,
        uid=str(user.id) 
    )
    
    # Assuming the app is in "Secured Mode" (requires token). 
    # If app is in "Testing Mode" (ID only), token comes back None if cert missing, 
    # but frontend can proceed with just App ID usually if backend logic allows.
    
    app_id = agora_service.app_id
    
    return jsonify({
        "token": token,
        "appId": app_id,
        "channel": channel_name,
        "uid": str(user.id)
    })
