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

import threading
from flask import current_app

@presence_bp.route('/update', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_presence():
    """Update user presence - Asynchronous and strictly non-blocking"""
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Grab app object to pass to background thread
    app = current_app._get_current_object()
    
    def async_db_update(app_context, user_id, payload):
        with app_context:
            try:
                from app import db
                from app.models.collaboration import Presence
                now = datetime.utcnow()
                
                rows_updated = Presence.query.filter_by(user_id=user_id).update({
                    'last_seen': now,
                    'status': payload.get('status', 'online'),
                    'current_resource_type': payload.get('current_resource_type'),
                    'current_resource_id': payload.get('current_resource_id')
                })
                
                if rows_updated == 0:
                    presence = Presence(
                        user_id=user_id, 
                        status=payload.get('status', 'online'), 
                        last_seen=now,
                        current_resource_type=payload.get('current_resource_type'),
                        current_resource_id=payload.get('current_resource_id')
                    )
                    db.session.add(presence)
                
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                # We fail silently here because this is a background heartbeat thread
                pass

    # Fire and forget
    threading.Thread(target=async_db_update, args=(app.app_context(), current_user_id, data)).start()
    
    return jsonify({'status': 'online', 'message': 'queued'}), 200

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

