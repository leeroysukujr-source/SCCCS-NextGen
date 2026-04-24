
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
        
    # Check file size (5MB limit)
    file.seek(0, os.SEEK_END)
    if file.tell() > 5 * 1024 * 1024:
        return jsonify({'error': 'File too large. Maximum size is 5MB.', 'success': False}), 400
    file.seek(0)
    
    # Security Enforcement: Simple extension/mimetype check instead of dangerous imghdr
    file_content = file.read()
    if file.mimetype and not file.mimetype.startswith('image/'):
        return jsonify({'error': 'Invalid format. Only images are allowed.', 'success': False}), 400
    
    # Reset file pointer after reading for save_logo
    file.seek(0)
    
    from app.utils.uploads import save_logo
    from app.utils.cache import cache_manager
    from app.models import SystemSetting
    from app import db
    
    try:
        # 1. Save file to absolute fixed path: 'static/uploads/system/logo.png'
        # This ensures the master brand is always served from a predictable location.
        logo_url = save_logo(file, folder='system', filename='logo.png')
        
        if not logo_url:
            return jsonify({'error': 'Failed to save logo', 'success': False}), 500
            
        # 2. Update DB: Ensure SYSTEM_LOGO_URL is updated directly in the table
        import time
        cache_buster = int(time.time())
        # Add cache buster to force browsers to fetch the new image
        versioned_logo_url = f"{logo_url}?v={cache_buster}"
        
        SystemSetting.query.filter_by(key='SYSTEM_LOGO_URL').update({
            'value': versioned_logo_url,
            'category': 'ui_ux',
            'is_public': True
        })
        db.session.commit()
        
        # 3. Clear Redis Cache: force-refresh the server-side cache for all sessions
        cache_manager.delete('public_settings')
        
        # 4. Global Real-time Notification
        from app import socketio
        socketio.emit('system_setting_updated', {
            'key': 'SYSTEM_LOGO_URL',
            'value': versioned_logo_url
        })
        
        print(f"[Master Brand] System logo updated and cache invalidated: {versioned_logo_url}")
        
        return jsonify({
            'success': True,
            'message': 'Global System Logo updated and cache invalidated',
            'logo_url': versioned_logo_url,
            'full_url': versioned_logo_url
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        print(f"[Master Brand] CRITICAL CRASH in upload_system_logo: {e}")
        return jsonify({'error': str(e), 'success': False}), 500
