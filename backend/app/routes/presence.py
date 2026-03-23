"""
User Presence Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.models.collaboration import Presence
from datetime import datetime, timedelta

presence_bp = Blueprint('presence', __name__)

from flask_cors import cross_origin
from app.utils.logger import log_error

@presence_bp.route('/update', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_presence():
    """Update user presence"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        data = request.get_json()
        
        presence = Presence.query.filter_by(user_id=current_user_id).first()
        if not presence:
            presence = Presence(user_id=current_user_id)
            db.session.add(presence)
        
        if 'status' in data:
            presence.status = data['status']  # online, away, busy, offline
        if 'current_resource_type' in data:
            presence.current_resource_type = data['current_resource_type']
        if 'current_resource_id' in data:
            presence.current_resource_id = data['current_resource_id']
        
        presence.last_seen = datetime.utcnow()
        db.session.commit()
        
        # Emit presence update via Socket.IO
        from app import socketio
        try:
            # Use namespace='/' to ensure it reaches the correct handlers
            socketio.emit('presence_updated', presence.to_dict(), namespace='/')
        except Exception:
            pass
        
        return jsonify(presence.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        log_error(f"Presence update failed: {e}")
        return jsonify({'error': str(e)}), 500

@presence_bp.route('/online', methods=['GET'])
@jwt_required()
def get_online_users():
    """Get list of online users"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Get users online in last 5 minutes
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
    
    online_presences = Presence.query.filter(
        Presence.status == 'online',
        Presence.last_seen >= five_minutes_ago
    ).all()
    
    users = []
    
    # Super Admin filter request
    req_workspace_id = None
    if current_user.role == 'super_admin':
        req_workspace_id = request.args.get('workspace_id')
    
    for presence in online_presences:
        user = User.query.get(presence.user_id)
        if not user:
            continue
            
        # Security: Filter for regular admins
        if current_user.role != 'super_admin':
            if user.workspace_id != current_user.workspace_id:
                continue
        
        # Filter for super admin if requested
        if req_workspace_id and str(user.workspace_id) != str(req_workspace_id):
            continue
            
        users.append({
            'user': user.to_dict(),
            'presence': presence.to_dict()
        })
    
    return jsonify(users), 200

@presence_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_presence(user_id):
    """Get specific user's presence"""
    presence = Presence.query.filter_by(user_id=user_id).first()
    
    if not presence:
        return jsonify({'status': 'offline'}), 200
    
    return jsonify(presence.to_dict()), 200

