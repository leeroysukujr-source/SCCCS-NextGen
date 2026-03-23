"""
Advanced Search Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Channel, Class, Message, Lesson, File
from sqlalchemy import or_, and_

search_bp = Blueprint('search', __name__)

@search_bp.route('', methods=['GET'])
@jwt_required()
def global_search():
    """Global search across all resources"""
    current_user_id = get_jwt_identity()
    query = request.args.get('q', '').strip()
    resource_type = request.args.get('type')  # channel, class, message, file, user
    limit = request.args.get('limit', 20, type=int)
    
    if not query or len(query) < 2:
        return jsonify({'error': 'Search query must be at least 2 characters'}), 400
    
    results = {
        'query': query,
        'results': []
    }
    
    user = User.query.get(current_user_id)
    
    # Search channels
    if not resource_type or resource_type == 'channel':
        if user.role == 'admin':
            channels = Channel.query.filter(
                or_(
                    Channel.name.ilike(f'%{query}%'),
                    Channel.description.ilike(f'%{query}%')
                )
            ).limit(limit).all()
        else:
            from app.models import ChannelMember
            channels = db.session.query(Channel).join(ChannelMember).filter(
                and_(
                    ChannelMember.user_id == current_user_id,
                    or_(
                        Channel.name.ilike(f'%{query}%'),
                        Channel.description.ilike(f'%{query}%')
                    )
                )
            ).limit(limit).all()
        
        for channel in channels:
            results['results'].append({
                'type': 'channel',
                'id': channel.id,
                'title': channel.name,
                'description': channel.description,
                'data': channel.to_dict()
            })
    
    # Search classes
    if not resource_type or resource_type == 'class':
        if user.role == 'admin':
            classes = Class.query.filter(
                or_(
                    Class.name.ilike(f'%{query}%'),
                    Class.description.ilike(f'%{query}%')
                )
            ).limit(limit).all()
        else:
            from app.models import ClassMember
            classes = db.session.query(Class).join(ClassMember).filter(
                and_(
                    ClassMember.user_id == current_user_id,
                    or_(
                        Class.name.ilike(f'%{query}%'),
                        Class.description.ilike(f'%{query}%')
                    )
                )
            ).limit(limit).all()
        
        for class_obj in classes:
            results['results'].append({
                'type': 'class',
                'id': class_obj.id,
                'title': class_obj.name,
                'description': class_obj.description,
                'data': class_obj.to_dict()
            })
    
    # Search messages
    if not resource_type or resource_type == 'message':
        if user.role == 'admin':
            # Admins can only search messages in channels they created
            messages = db.session.query(Message).join(Channel).filter(
                and_(
                    Channel.created_by == current_user_id,
                    Message.content.ilike(f'%{query}%')
                )
            ).limit(limit).all()
        else:
            from app.models import ChannelMember
            messages = db.session.query(Message).join(Channel).join(ChannelMember).filter(
                and_(
                    ChannelMember.user_id == current_user_id,
                    Message.content.ilike(f'%{query}%')
                )
            ).limit(limit).all()
        
        for message in messages:
            results['results'].append({
                'type': 'message',
                'id': message.id,
                'title': message.content[:100] + '...' if len(message.content) > 100 else message.content,
                'description': f"In {message.channel.name if message.channel else 'Unknown'}",
                'data': {
                    'id': message.id,
                    'content': message.content,
                    'channel_id': message.channel_id,
                    'created_at': message.created_at.isoformat() if message.created_at else None
                }
            })
    
    # Search files
    if not resource_type or resource_type == 'file':
        files = File.query.filter(
            File.original_filename.ilike(f'%{query}%')
        ).limit(limit).all()
        
        for file in files:
            results['results'].append({
                'type': 'file',
                'id': file.id,
                'title': file.original_filename,
                'description': f"{file.file_size} bytes",
                'data': {
                    'id': file.id,
                    'filename': file.original_filename,
                    'file_size': file.file_size,
                    'mime_type': file.mime_type
                }
            })
    
    return jsonify(results), 200

