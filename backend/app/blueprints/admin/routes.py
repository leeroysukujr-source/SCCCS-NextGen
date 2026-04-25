from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import SystemSetting, User
from app.utils.cache import cache_manager
from app.utils.uploads import save_logo
from app.utils.roles import is_super_admin

admin_logo_bp = Blueprint('admin_logo', __name__)

from flask_cors import cross_origin
import time

@admin_logo_bp.route('/system/logo', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required(optional=True)
def upload_system_logo():
    """
    Robust Global System Logo Persistence
    Instruction: Save the file as system_logo.png (overwrite old one).
    Update DB, return Full URL with a cache-buster timestamp.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    uid = get_jwt_identity()
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401
        
    try:
        user = User.query.get(uid)
        
        if not (is_super_admin(user) or getattr(user, 'platform_role', '') == 'SUPER_ADMIN'):
            return jsonify({'error': 'Super Admin access required', 'success': False}), 403

        if 'file' not in request.files:
            return jsonify({'error': 'No file part', 'success': False}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file', 'success': False}), 400

        # Step A: Persistent Cloud Upload using save_logo utility
        filename = "system_logo.png"
        file.seek(0)
        logo_url = save_logo(file, folder='system', filename=filename)
        
        if not logo_url:
            return jsonify({'error': 'Failed to save logo to storage', 'success': False}), 500

        # Step B: Update DB logic
        try:
            SystemSetting.query.filter_by(key='SYSTEM_LOGO_URL').update({'value': logo_url})
            SystemSetting.query.filter_by(key='branding_logo_url').update({'value': logo_url})
            db.session.commit()
        except Exception as db_err:
            db.session.rollback()
            print(f"[Master Brand] DB update failed: {db_err}")
            return jsonify({'error': f'Database update failed: {str(db_err)}', 'success': False}), 500

        # Step C: Return the Full URL with cache-buster
        cache_buster = int(time.time())
        if logo_url.startswith('http'):
            final_url = f"{logo_url}{'&' if '?' in logo_url else '?'}v={cache_buster}"
        else:
            final_url = f"{request.host_url.rstrip('/')}{logo_url}?v={cache_buster}"
        
        # Invalidate Cache
        try:
            cache_manager.delete('public_settings')
        except:
            pass
        
        print(f"[Master Brand] Global system logo updated: {final_url}")
        
        return jsonify({
            "success": True, 
            "logo_url": final_url,
            "message": "Global branding updated successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        from app.utils.supabase import handle_supabase_error
        print(f"[Master Brand] CRITICAL CRASH in upload_system_logo: {e}")
        return handle_supabase_error(e)
