"""
Advanced Notification Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.models.notifications import Notification, NotificationPreference
from datetime import datetime
from sqlalchemy import and_

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get user notifications"""
    current_user_id = get_jwt_identity()
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = request.args.get('limit', 50, type=int)
    
    query = Notification.query.filter(Notification.user_id == current_user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    return jsonify([n.to_dict() for n in notifications]), 200

@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark notification as read"""
    current_user_id = get_jwt_identity()
    notification = Notification.query.get(notification_id)
    
    if not notification:
        return jsonify({'error': 'Notification not found'}), 404
    
    if notification.user_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403
    
    notification.mark_as_read()
    db.session.commit()
    
    return jsonify(notification.to_dict()), 200

@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    """Mark all notifications as read"""
    current_user_id = get_jwt_identity()
    
    Notification.query.filter(
        and_(
            Notification.user_id == current_user_id,
            Notification.is_read == False
        )
    ).update({'is_read': True, 'read_at': datetime.utcnow()})
    
    db.session.commit()
    
    return jsonify({'message': 'All notifications marked as read'}), 200

@notifications_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_notification_preferences():
    """Get user notification preferences"""
    current_user_id = get_jwt_identity()
    
    pref = NotificationPreference.query.filter_by(user_id=current_user_id).first()
    if not pref:
        # Create default preferences
        pref = NotificationPreference(user_id=current_user_id)
        db.session.add(pref)
        db.session.commit()
    
    return jsonify(pref.to_dict()), 200

@notifications_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_notification_preferences():
    """Update user notification preferences"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    pref = NotificationPreference.query.filter_by(user_id=current_user_id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user_id)
        db.session.add(pref)
    
    if 'email_enabled' in data:
        pref.email_enabled = data['email_enabled']
    if 'push_enabled' in data:
        pref.push_enabled = data['push_enabled']
    if 'in_app_enabled' in data:
        pref.in_app_enabled = data['in_app_enabled']
    if 'notification_types' in data:
        import json
        pref.notification_types = json.dumps(data['notification_types'])
    
    db.session.commit()
    
    return jsonify(pref.to_dict()), 200

@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications"""
    current_user_id = get_jwt_identity()
    
    count = Notification.query.filter(
        and_(
            Notification.user_id == current_user_id,
            Notification.is_read == False
        )
    ).count()
    
    return jsonify({'count': count}), 200

