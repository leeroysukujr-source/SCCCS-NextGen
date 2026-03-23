"""
API Documentation endpoint
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User

api_docs_bp = Blueprint('api_docs', __name__)

@api_docs_bp.route('/docs', methods=['GET'])
@jwt_required()
def get_api_docs():
    """Get API documentation (available endpoints)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    docs = {
        'title': 'SCCCS NextGen API Documentation',
        'version': '1.0.0',
        'base_url': '/api',
        'endpoints': {
            'auth': {
                'POST /api/auth/register': 'Register a new user',
                'POST /api/auth/login': 'Login and get access token',
                'GET /api/auth/me': 'Get current user info',
                'POST /api/auth/refresh': 'Refresh access token',
                'GET /api/auth/oauth/<provider>/authorize': 'Initiate OAuth flow'
            },
            'users': {
                'GET /api/users': 'Get all users',
                'GET /api/users/<id>': 'Get user by ID',
                'PUT /api/users/<id>': 'Update user',
                'DELETE /api/users/<id>': 'Delete user'
            },
            'rooms': {
                'POST /api/rooms': 'Create a meeting room',
                'GET /api/rooms': 'Get all rooms',
                'GET /api/rooms/<id>': 'Get room by ID',
                'POST /api/rooms/<id>/join': 'Join a room',
                'POST /api/rooms/<id>/leave': 'Leave a room'
            },
            'channels': {
                'POST /api/channels': 'Create a channel',
                'GET /api/channels': 'Get all channels',
                'GET /api/channels/<id>': 'Get channel by ID',
                'PUT /api/channels/<id>': 'Update channel',
                'DELETE /api/channels/<id>': 'Delete channel'
            },
            'messages': {
                'POST /api/messages/channel/<channel_id>': 'Send a message',
                'GET /api/messages/channel/<channel_id>': 'Get messages in channel',
                'PUT /api/messages/<id>': 'Update a message',
                'DELETE /api/messages/<id>': 'Delete a message'
            },
            'direct_messages': {
                'POST /api/direct-messages/conversation/<user_id>': 'Send direct message',
                'GET /api/direct-messages/conversation/<user_id>': 'Get conversation',
                'GET /api/direct-messages/conversations': 'Get all conversations',
                'PUT /api/direct-messages/<id>/read': 'Mark message as read',
                'PUT /api/direct-messages/<id>': 'Update message',
                'DELETE /api/direct-messages/<id>': 'Delete message',
                'POST /api/direct-messages/initiate-call': 'Initiate a call'
            },
            'classes': {
                'POST /api/classes': 'Create a class',
                'GET /api/classes': 'Get all classes',
                'GET /api/classes/<id>': 'Get class by ID',
                'POST /api/classes/<id>/join': 'Join a class',
                'POST /api/classes/<id>/leave': 'Leave a class'
            },
            'feedback': {
                'POST /api/feedback': 'Submit feedback',
                'GET /api/feedback': 'Get all feedback',
                'GET /api/feedback/<id>': 'Get feedback by ID',
                'PUT /api/feedback/<id>/respond': 'Respond to feedback'
            },
            'health': {
                'GET /health': 'Health check',
                'GET /status': 'System status',
                'GET /ready': 'Readiness probe',
                'GET /live': 'Liveness probe'
            }
        }
    }
    
    return jsonify(docs), 200



