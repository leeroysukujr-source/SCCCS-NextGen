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
@cross_origin(
    origins=["https://scccs-next-gen-nine.vercel.app", "https://scccs-next-gen.vercel.app", "https://scccs-nextgen-q2ll.onrender.com"],
    allow_headers="*",
    methods=["POST", "OPTIONS"],
    supports_credentials=True
)
@jwt_required()
def upload_system_logo():
    """
    Robust Global System Logo Persistence
    Instruction: Save the file as system_logo.png (overwrite old one).
    Update DB, return Full URL with a cache-buster timestamp.
    """
    import os
    from flask import current_app
    
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        uid = get_jwt_identity()
        user = User.query.get(uid)
        
        if not (is_super_admin(user) or getattr(user, 'platform_role', '') == 'SUPER_ADMIN'):
            return jsonify({'error': 'Super Admin access required', 'success': False}), 403

        if 'file' not in request.files:
            return jsonify({'error': 'No file part', 'success': False}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file', 'success': False}), 400

        # Step A: Persistent Cloud Upload using save_logo utility
        # Centralized logic handles S3/Supabase vs Local fallback
        filename = "system_logo.png"
        file.seek(0)
        logo_url = save_logo(file, folder='system', filename=filename)
        
        if not logo_url:
            return jsonify({'error': 'Failed to save logo to storage', 'success': False}), 500

        # Step B: Update DB logic (Setting table where key='SYSTEM_LOGO_URL')
        try:
            # We use SystemSetting model as found in the codebase
            SystemSetting.query.filter_by(key='SYSTEM_LOGO_URL').update({'value': logo_url})
            SystemSetting.query.filter_by(key='branding_logo_url').update({'value': logo_url})
            db.session.commit()
        except Exception as db_err:
            print(f"[Master Brand] DB update failed: {db_err}")
            return jsonify({'error': f'Database update failed: {str(db_err)}', 'success': False}), 500

        # Step C: Return the Full URL with a cache-buster timestamp
        cache_buster = int(time.time())
        if logo_url.startswith('http'):
            final_url = f"{logo_url}{'&' if '?' in logo_url else '?'}v={cache_buster}"
        else:
            final_url = f"{request.host_url.rstrip('/')}{logo_url}?v={cache_buster}"
        
        # Invalidate Cache
        try: cache_manager.delete('public_settings')
        except: pass
        
        print(f"[Master Brand] Global system logo updated: {final_url}")
        
        return jsonify({
            "success": True, 
            "logo_url": final_url,
            "message": "Global branding updated successfully"
        }), 200

    except Exception as e:
        print(f"[Master Brand] CRITICAL CRASH in upload_system_logo: {e}")
        return jsonify({'error': str(e), 'success': False}), 500
