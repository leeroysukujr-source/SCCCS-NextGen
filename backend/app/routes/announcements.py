from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Announcement, User
from app.utils.decorators import permission_required
from datetime import datetime

announcements_bp = Blueprint('announcements', __name__)

@announcements_bp.route('/', methods=['GET'])
@jwt_required()
def list_announcements():
    """List announcements for current user's workspace"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user.workspace_id and user.role != 'super_admin':
        return jsonify([]), 200
        
    query = Announcement.query.filter_by(workspace_id=user.workspace_id, is_active=True)
    
    # Optional category/priority filter
    priority = request.args.get('priority')
    if priority:
        query = query.filter_by(priority=priority)
        
    announcements = query.order_by(Announcement.created_at.desc()).all()
    return jsonify([a.to_dict() for a in announcements]), 200

@announcements_bp.route('/', methods=['POST'])
@jwt_required()
@permission_required('manage_workspace')  # Or distinct permission?
def create_announcement():
    """Create a new announcement in the workspace"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user.workspace_id and user.role != 'super_admin':
        return jsonify({'error': 'No workspace context'}), 400
        
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    priority = data.get('priority', 'normal')
    
    if not title or not content:
        return jsonify({'error': 'Title and content required'}), 400
        
    announcement = Announcement(
        workspace_id=user.workspace_id,
        author_id=current_user_id,
        title=title,
        content=content,
        priority=priority,
        created_at=datetime.utcnow()
    )
    
    db.session.add(announcement)
    db.session.commit()
    
    return jsonify(announcement.to_dict()), 201

@announcements_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@permission_required('manage_workspace')
def delete_announcement(id):
    """Delete an announcement"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    announcement = Announcement.query.get(id)
    if not announcement:
        return jsonify({'error': 'Not found'}), 404
        
    # Scope check
    if announcement.workspace_id != user.workspace_id and user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    db.session.delete(announcement)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200
