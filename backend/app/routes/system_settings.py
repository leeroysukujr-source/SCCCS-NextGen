
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User
from app.services.settings_service import settings_service
from app.utils.roles import is_super_admin
from functools import wraps

system_settings_bp = Blueprint('system_settings', __name__)

def super_admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        uid = get_jwt_identity()
        user = User.query.get(uid)
        is_platform_sa = getattr(user, 'platform_role', '') == 'SUPER_ADMIN'
        if not (is_super_admin(user) or is_platform_sa):
            return jsonify({'error': 'Super Admin access required'}), 403
        return f(*args, **kwargs)
    return wrapper

@system_settings_bp.route('/public', methods=['GET'])
def get_public_settings():
    """Get all public system settings (no auth required)"""
    settings = settings_service.get_system_settings(public_only=True)
    return jsonify(settings), 200

@system_settings_bp.route('/', methods=['GET'])
@jwt_required()
@super_admin_required
def get_all_system_settings():
    """Get all system settings (super admin only) - returns rich objects"""
    settings = settings_service.get_all_system_settings_objects()
    return jsonify([s.to_dict() for s in settings]), 200

@system_settings_bp.route('/', methods=['PUT'])
@jwt_required()
@super_admin_required
def update_system_settings():
    """Update system settings (super admin only)"""
    data = request.get_json()
    updates = data.get('settings', {})
    
    updated = {}
    for key, val in updates.items():
        # Handle simple key:value updates for now
        # If frontend sends { 'APP_NAME': 'Foo' }
        # We need to preserve finding the existing category/etc logic or just defaults
        # For simplicity, we assume frontend logic passes full updates or we just update value.
        # But set_system_setting requires category etc.
        # Ideally frontend provides structured data.
        
        # If value is simple:
        s = settings_service.set_system_setting(key, val)
        updated[key] = s.get_value()
            
    return jsonify({
        'message': 'System settings updated',
        'settings': updated
    }), 200

@system_settings_bp.route('/logo', methods=['POST'])
@jwt_required()
@super_admin_required
def upload_system_logo():
    """Upload or update system logo (super admin only)"""
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
