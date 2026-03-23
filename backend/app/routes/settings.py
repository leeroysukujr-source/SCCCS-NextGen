from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.services.settings_service import settings_service
from app.utils.middleware import platform_super_admin_required, workspace_required
from app.models import User

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/public', methods=['GET'])
def get_public_settings():
    """Get all public (non-sensitive) system settings"""
    return jsonify(settings_service.get_system_settings(public_only=True)), 200

@settings_bp.route('/platform', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def get_platform_settings():
    """Get all platform-level system settings (Super Admin only)"""
    return jsonify(settings_service.get_system_settings()), 200

@settings_bp.route('/platform', methods=['PUT'])
@jwt_required()
@platform_super_admin_required
def update_platform_setting():
    """Create or update a platform-level system setting (Super Admin only)"""
    data = request.get_json()
    if not data or 'key' not in data or 'value' not in data:
        return jsonify({'error': 'Missing key or value'}), 400
        
    try:
        settings_service.set_system_setting(
            key=data['key'],
            value=data['value'],
            category=data.get('category', 'general'),
            value_type=data.get('value_type', 'string'),
            description=data.get('description'),
            is_public=data.get('is_public', False),
            admin_only=data.get('admin_only', True),
            is_overridable=data.get('is_overridable', False)
        )
        return jsonify({'message': 'Setting updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/institutional/<int:workspace_id>', methods=['GET'])
@jwt_required()
@workspace_required
def get_institutional_settings(workspace_id):
    """Get overridable settings and their effective values for a workspace"""
    return jsonify(settings_service.get_all_settings(workspace_id)), 200

@settings_bp.route('/institutional/<int:workspace_id>', methods=['PUT'])
@jwt_required()
@workspace_required
def update_institutional_setting(workspace_id):
    """Update a permitted override for a workspace"""
    data = request.get_json()
    if not data or 'key' not in data or 'value' not in data:
        return jsonify({'error': 'Missing key or value'}), 400
        
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    is_super_admin = user.platform_role == 'SUPER_ADMIN' if user else False

    try:
        settings_service.set_setting(
            workspace_id=workspace_id,
            key=data['key'],
            value=data['value'],
            user_id=user_id,
            is_super_admin=is_super_admin
        )
        return jsonify({'message': 'Institutional setting updated successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500
