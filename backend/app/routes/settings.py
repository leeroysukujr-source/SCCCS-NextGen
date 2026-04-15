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
    try:
        return jsonify(settings_service.get_system_settings(public_only=True)), 200
    except Exception:
        return jsonify([]), 200  # Return empty if table not yet seeded

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

@settings_bp.route('/system/logo', methods=['POST'])
@jwt_required()
@platform_super_admin_required
def upload_system_logo():
    """Upload or update system logo (platform super admin only)"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    from app.utils.uploads import save_logo
    # Use save_logo which handles S3 storage if configured
    logo_url = save_logo(file, folder='system')
    
    if not logo_url:
        return jsonify({'error': 'Failed to save logo'}), 500
        
    # Update System Setting
    settings_service.set_system_setting('SYSTEM_LOGO_URL', logo_url, category='ui_ux', is_public=True)
    
    return jsonify({
        'message': 'System logo updated',
        'logo_url': logo_url
    }), 200

@settings_bp.route('/diag/upload-test', methods=['GET'])
def diag_upload_test():
    """Diagnostic endpoint to test file system permissions and paths"""
    import os
    from flask import current_app
    from app.utils.uploads import save_logo
    
    results = {
        'cwd': os.getcwd(),
        'root_path': current_app.root_path,
        'backend_dir': os.path.dirname(current_app.root_path),
        'upload_folder': current_app.config.get('UPLOAD_FOLDER'),
        'env': {k: '***' if 'KEY' in k or 'SECRET' in k or 'PASS' in k else v for k, v in os.environ.items() if 'S3' in k or 'PORT' in k or 'RENDER' in k},
        'write_test': {}
    }
    
    # Test path calculation
    backend_dir = os.path.dirname(current_app.root_path)
    upload_base = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    if not os.path.isabs(upload_base):
        upload_path = os.path.join(backend_dir, upload_base, 'diag')
    else:
        upload_path = os.path.join(upload_base, 'diag')
    
    results['calculated_upload_path'] = upload_path
    
    try:
        os.makedirs(upload_path, exist_ok=True)
        test_file = os.path.join(upload_path, 'test.txt')
        with open(test_file, 'w') as f:
            f.write('test')
        results['write_test']['primary'] = {'success': True, 'path': test_file}
    except Exception as e:
        results['write_test']['primary'] = {'success': False, 'error': str(e)}
        
    # Check if system_settings table exists
    try:
        from app.models import SystemSetting
        count = SystemSetting.query.count()
        results['db_test'] = {'success': True, 'system_settings_count': count}
    except Exception as e:
        results['db_test'] = {'success': False, 'error': str(e)}
        
    return jsonify(results), 200

