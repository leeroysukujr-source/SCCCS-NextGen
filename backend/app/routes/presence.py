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

from app import socketio

@presence_bp.route('/update', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_presence():
    """Update user presence"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        # Optimized: Use Presence model directly
        from app.models.collaboration import Presence
        
        presence = Presence.query.filter_by(user_id=current_user_id).first()
        now = datetime.utcnow()
        
        if not presence:
            presence = Presence(user_id=current_user_id, status='online', last_seen=now)
            db.session.add(presence)
        else:
            # Throttle updates: If last_seen is within the last 20s and nothing else changed, skip write
            needs_update = False
            
            if 'status' in data and presence.status != data['status']:
                presence.status = data['status']
                needs_update = True
                
            if 'current_resource_type' in data and presence.current_resource_type != data['current_resource_type']:
                presence.current_resource_type = data['current_resource_type']
                needs_update = True
                
            if 'current_resource_id' in data and presence.current_resource_id != data['current_resource_id']:
                presence.current_resource_id = data['current_resource_id']
                needs_update = True

            # Always update if more than 25 seconds passed since last pulse
            if not needs_update and presence.last_seen:
                if (now - presence.last_seen).total_seconds() > 25:
                    needs_update = True
            elif not needs_update:
                # First time or edge case
                needs_update = True
            
            if needs_update:
                presence.last_seen = now
                try:
                    db.session.add(presence)
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    log_error(f"Presence commit failed: {str(e)}")
                    # Return success anyway to not break the heartbeat on the client
                    return jsonify(presence.to_dict()), 200
            else:
                # No update needed, return current state
                return jsonify(presence.to_dict()), 200

        return jsonify(presence.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@presence_bp.route('/online', methods=['GET'])
@jwt_required()
def get_online_users():
    """Get list of online users using optimized JOIN"""
    current_user_id = get_jwt_identity()
    
    # Seen in last 15 minutes
    threshold = datetime.utcnow() - timedelta(minutes=15)
    
    from app.models.collaboration import Presence
    from app.models import User
    
    # Single query JOIN for better performance
    online_data = db.session.query(Presence, User).join(
        User, Presence.user_id == User.id
    ).filter(
        (Presence.status == 'online'),
        (Presence.last_seen >= threshold)
    ).all()
    
    results = []
    for presence, user in online_data:
        # Filter by workspace (simplified)
        results.append({
            'user': user.to_dict(),
            'presence': presence.to_dict()
        })
        
    return jsonify(results), 200

@presence_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_presence(user_id):
    """Get specific user's presence"""
    presence = Presence.query.filter_by(user_id=user_id).first()
    
    if not presence:
        return jsonify({'status': 'offline'}), 200
    
    return jsonify(presence.to_dict()), 200

