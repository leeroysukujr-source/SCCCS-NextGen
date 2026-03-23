"""
Message search routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Message, Channel, ChannelMember, User
from app.utils.response import success_response, error_response
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
from app.utils.middleware import feature_required

message_search_bp = Blueprint('message_search', __name__)

@message_search_bp.before_request
@feature_required('search')
def check_search_enabled():
    pass

@message_search_bp.route('/channel/<int:channel_id>', methods=['GET'])
@jwt_required()
def search_messages(channel_id):
    """Search messages in a channel with filters"""
    current_user_id = get_jwt_identity()
    
    channel = Channel.query.get(channel_id)
    if not channel:
        return error_response('Channel not found', 404)
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(
        channel_id=channel_id,
        user_id=current_user_id
    ).first()
    
    if not member:
        return error_response('Access denied', 403)
    
    # Get search parameters
    query = request.args.get('q', '').strip()
    author_id = request.args.get('author_id', type=int)
    message_type = request.args.get('type')  # text, file, image, etc.
    date_from = request.args.get('date_from')  # ISO format
    date_to = request.args.get('date_to')  # ISO format
    mentions_only = request.args.get('mentions_only', 'false').lower() == 'true'
    has_files = request.args.get('has_files', 'false').lower() == 'true'
    limit = min(request.args.get('limit', 50, type=int), 100)  # Max 100
    offset = request.args.get('offset', 0, type=int)
    
    # Build query
    base_query = Message.query.filter_by(channel_id=channel_id)
    
    # Text search
    if query:
        base_query = base_query.filter(Message.content.ilike(f'%{query}%'))
    
    # Filter by author
    if author_id:
        base_query = base_query.filter(Message.author_id == author_id)
    
    # Filter by type
    if message_type:
        base_query = base_query.filter(Message.message_type == message_type)
    
    # Filter by date range
    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            base_query = base_query.filter(Message.created_at >= date_from_obj)
        except Exception:
            pass
    
    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            base_query = base_query.filter(Message.created_at <= date_to_obj)
        except Exception:
            pass
    
    # Filter by mentions
    if mentions_only:
        base_query = base_query.filter(Message.mentions.isnot(None))
        if query:  # Search within mentions
            # This is a simplified search - in production, you'd parse JSON
            base_query = base_query.filter(Message.mentions.ilike(f'%{query}%'))
    
    # Filter by files
    if has_files:
        base_query = base_query.filter(
            or_(
                Message.message_type.in_(['file', 'image', 'video', 'audio']),
                Message.id.in_(
                    db.session.query(Message.id).join(
                        db.session.query(db.Column('file', db.Integer)).select_from(
                            db.Table('files', db.MetaData(), autoload_with=db.engine)
                        )
                    ).filter(db.Column('message_id') == Message.id)
                ) if hasattr(db, 'Table') else base_query  # Fallback if table doesn't exist
            )
        )
    
    # Order by date (newest first)
    base_query = base_query.order_by(Message.created_at.desc())
    
    # Get total count
    total = base_query.count()
    
    # Apply pagination
    messages = base_query.offset(offset).limit(limit).all()
    
    # Decrypt messages if needed
    if channel.is_encrypted and channel.encryption_key:
        from app.utils.encryption import decrypt_message
        try:
            encryption_key = channel.encryption_key.encode('utf-8')
            for message in messages:
                if message.is_encrypted and message.content:
                    try:
                        message.content = decrypt_message(message.content, encryption_key)
                    except Exception:
                        pass
        except Exception:
            pass
    
    return success_response({
        'messages': [msg.to_dict() for msg in messages],
        'total': total,
        'limit': limit,
        'offset': offset,
        'has_more': (offset + limit) < total
    })

@message_search_bp.route('/global', methods=['GET'])
@jwt_required()
def search_all_messages():
    """Search messages across all channels user is a member of"""
    current_user_id = get_jwt_identity()
    
    query = request.args.get('q', '').strip()
    if not query:
        return error_response('Search query is required', 400)
    
    limit = min(request.args.get('limit', 50, type=int), 100)
    offset = request.args.get('offset', 0, type=int)
    
    # Get all channels user is a member of
    member_channels = ChannelMember.query.filter_by(user_id=current_user_id).all()
    channel_ids = [m.channel_id for m in member_channels]
    
    if not channel_ids:
        return success_response({
            'messages': [],
            'total': 0,
            'limit': limit,
            'offset': offset,
            'has_more': False
        })
    
    # Search across all channels
    base_query = Message.query.filter(Message.channel_id.in_(channel_ids))
    base_query = base_query.filter(Message.content.ilike(f'%{query}%'))
    base_query = base_query.order_by(Message.created_at.desc())
    
    total = base_query.count()
    messages = base_query.offset(offset).limit(limit).all()
    
    # Decrypt messages if needed (simplified - in production, decrypt per channel)
    for message in messages:
        channel = Channel.query.get(message.channel_id)
        if channel and channel.is_encrypted and channel.encryption_key:
            from app.utils.encryption import decrypt_message
            try:
                encryption_key = channel.encryption_key.encode('utf-8')
                if message.is_encrypted and message.content:
                    message.content = decrypt_message(message.content, encryption_key)
            except Exception:
                pass
    
    return success_response({
        'messages': [msg.to_dict() for msg in messages],
        'total': total,
        'limit': limit,
        'offset': offset,
        'has_more': (offset + limit) < total
    })

