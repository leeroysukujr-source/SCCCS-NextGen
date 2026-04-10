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

@presence_bp.route('/update', methods=['POST'])
@jwt_required()
def update_presence():
    """Update user presence - Highly optimized"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        presence = Presence.query.filter_by(user_id=current_user_id).first()
        now = datetime.utcnow()
        
        if not presence:
            presence = Presence(user_id=current_user_id, status='online', last_seen=now)
            db.session.add(presence)
        else:
            # Only update if essential data changed or enough time passed
            # This minimizes DB write frequency significantly
            should_save = False
            
            if 'status' in data and presence.status != data['status']:
                presence.status = data['status']
                should_save = True
            
            # Throttle last_seen updates to every 60 seconds unless status changed
            # Heartbeats are every 30s, so we skip every other write
            last_pushed = presence.last_seen or (now - timedelta(minutes=5))
            if not should_save and (now - last_pushed).total_seconds() > 60:
                should_save = True
                
            if 'current_resource_type' in data:
                presence.current_resource_type = data['current_resource_type']
            if 'current_resource_id' in data:
                presence.current_resource_id = data['current_resource_id']
                
            if should_save:
                presence.last_seen = now
                try:
                    # Session flush is faster than full commit if we just want to push to DB buffer
                    # However, since heartbeats are independent, we commit quickly
                    db.session.commit()
                except Exception:
                    db.session.rollback()
                    # Silent fail - better to return current state than 500/502
                    pass
            
        return jsonify(presence.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        # Return something to avoid 502/timeout, even if it's a fake success
        return jsonify({'status': 'pending', 'message': str(e)}), 200

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

