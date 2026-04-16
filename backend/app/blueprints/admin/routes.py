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
    Robust Global System Logo Persistence
    Instruction: Save the file as system_logo.png (overwrite old one).
    Update DB, return Full URL with a cache-buster timestamp.
    """
    import os, time
    from flask import current_app
    
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

        # Step A: Explicitly ensure the system branding directory exists and has permissions
        static_folder = current_app.static_folder or os.path.join(current_app.root_path, 'static')
        system_logo_path = os.path.join(static_folder, 'uploads', 'system')
        
        if not os.path.exists(system_logo_path):
            os.makedirs(system_logo_path, mode=0o777, exist_ok=True)
        else:
            try: os.chmod(system_logo_path, 0o777)
            except: pass

        # Step B: Save file as system_logo.png (Fixed name for persistence)
        filename = "system_logo.png"
        target_path = os.path.join(system_logo_path, filename)
        file.save(target_path)
        
        # Step C: Update DB logic (Setting table where key='SYSTEM_LOGO_URL')
        # We also update 'branding_logo_url' for legacy compatibility
        logo_url = f"/static/uploads/system/{filename}"
        
        try:
            # We use SystemSetting model as found in the codebase
            SystemSetting.query.filter_by(key='SYSTEM_LOGO_URL').update({'value': logo_url})
            SystemSetting.query.filter_by(key='branding_logo_url').update({'value': logo_url})
            db.session.commit()
        except Exception as db_err:
            print(f"[Master Brand] DB update failed: {db_err}")
            # Non-fatal to the file upload itself, but return 500 if persistence is critical
            return jsonify({'error': f'Database update failed: {str(db_err)}', 'success': False}), 500

        # Step D: Return the Full URL with a cache-buster timestamp
        # This forces the browser to stop showing the old version
        cache_buster = int(time.time())
        full_url = f"{request.host_url.rstrip('/')}{logo_url}?v={cache_buster}"
        
        # Invalidate Cache if using Redis/Memory cache
        try: cache_manager.delete('public_settings')
        except: pass
        
        print(f"[Master Brand] Global system logo updated: {full_url}")
        
        return jsonify({
            "success": True, 
            "logo_url": full_url,
            "message": "Global branding updated successfully"
        }), 200

    except Exception as e:
        print(f"[Master Brand] CRITICAL CRASH in upload_system_logo: {e}")
        return jsonify({'error': str(e), 'success': False}), 500
