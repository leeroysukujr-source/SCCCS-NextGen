"""
Automation and Scheduled Tasks Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.utils.audit import log_audit_event
from datetime import datetime, timedelta
import json

automation_bp = Blueprint('automation', __name__)

@automation_bp.route('/tasks', methods=['GET'])
@jwt_required()
def get_automation_tasks():
    """Get automation tasks (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # In a real system, these would be stored in a database
    # For now, return example tasks
    tasks = [
        {
            'id': 1,
            'name': 'Daily Analytics Report',
            'type': 'scheduled',
            'schedule': '0 9 * * *',  # 9 AM daily
            'is_active': True,
            'last_run': (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            'next_run': (datetime.utcnow() + timedelta(hours=7)).isoformat()
        },
        {
            'id': 2,
            'name': 'Cleanup Old Sessions',
            'type': 'scheduled',
            'schedule': '0 0 * * 0',  # Weekly on Sunday
            'is_active': True,
            'last_run': (datetime.utcnow() - timedelta(days=2)).isoformat(),
            'next_run': (datetime.utcnow() + timedelta(days=5)).isoformat()
        }
    ]
    
    return jsonify(tasks), 200

@automation_bp.route('/triggers', methods=['GET'])
@jwt_required()
def get_automation_triggers():
    """Get available automation triggers"""
    triggers = [
        {
            'id': 'message_sent',
            'name': 'Message Sent',
            'description': 'Triggered when a message is sent in a channel',
            'parameters': ['channel_id', 'user_id', 'message_content']
        },
        {
            'id': 'file_uploaded',
            'name': 'File Uploaded',
            'description': 'Triggered when a file is uploaded',
            'parameters': ['file_id', 'user_id', 'file_type']
        },
        {
            'id': 'user_joined_class',
            'name': 'User Joined Class',
            'description': 'Triggered when a user joins a class',
            'parameters': ['class_id', 'user_id']
        },
        {
            'id': 'lesson_created',
            'name': 'Lesson Created',
            'description': 'Triggered when a lesson is created',
            'parameters': ['lesson_id', 'class_id', 'user_id']
        }
    ]
    
    return jsonify(triggers), 200

@automation_bp.route('/actions', methods=['GET'])
@jwt_required()
def get_automation_actions():
    """Get available automation actions"""
    actions = [
        {
            'id': 'send_notification',
            'name': 'Send Notification',
            'description': 'Send a notification to users',
            'parameters': ['user_ids', 'title', 'message']
        },
        {
            'id': 'create_webhook',
            'name': 'Trigger Webhook',
            'description': 'Trigger a webhook',
            'parameters': ['webhook_id', 'payload']
        },
        {
            'id': 'send_email',
            'name': 'Send Email',
            'description': 'Send an email',
            'parameters': ['to', 'subject', 'body']
        },
        {
            'id': 'update_database',
            'name': 'Update Database',
            'description': 'Update database records',
            'parameters': ['table', 'conditions', 'updates']
        }
    ]
    
    return jsonify(actions), 200

