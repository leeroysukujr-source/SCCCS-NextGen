from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import SystemSetting, User
from app.utils.cache import cache_manager
from app.utils.uploads import save_logo
from app.utils.roles import is_super_admin

admin_logo_bp = Blueprint('admin_logo', __name__)

@admin_logo_bp.route('/system/logo', methods=['POST'])
@jwt_required()
def upload_system_logo():
    """
    Global System Logo Persistence (The Master Brand)
    Instruction: When the SuperAdmin uploads a global logo, the system must update the 
    settings table in the database and force-refresh the server-side cache.
    """
    uid = get_jwt_identity()
    user = User.query.get(uid)
    
    if not (is_super_admin(user) or getattr(user, 'platform_role', '') == 'SUPER_ADMIN'):
        return jsonify({'error': 'Super Admin access required', 'success': False}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file part', 'success': False}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file', 'success': False}), 400
        
    # 1. Save file to absolute fixed path: 'static/uploads/system/logo.png'
    # Instruction: Save file to 'static/uploads/system/logo.png'
    logo_url = save_logo(file, folder='system', filename='logo.png')
    
    if not logo_url:
        return jsonify({'error': 'Failed to save logo', 'success': False}), 500
        
    # 2. Update DB: Setting.query.filter_by(key='SYSTEM_LOGO_URL').update({'value': new_url})
    # Instruction: Update DB: Setting.query.filter_by(key='SYSTEM_LOGO_URL').update({'value': new_url})
    SystemSetting.query.filter_by(key='SYSTEM_LOGO_URL').update({'value': logo_url})
    db.session.commit()
    
    # 3. Clear Redis Cache: redis_client.delete('public_settings')
    # Instruction: Clear Redis Cache: redis_client.delete('public_settings')
    cache_manager.delete('public_settings')
    
    print(f"[Master Brand] System logo updated and cache invalidated: {logo_url}")
    
    return jsonify({
        'success': True,
        'message': 'Global System Logo updated and cache invalidated',
        'logo_url': logo_url,
        'full_url': logo_url
    }), 200
