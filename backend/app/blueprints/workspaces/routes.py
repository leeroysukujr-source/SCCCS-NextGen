from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models import Workspace, User
from flask_cors import cross_origin
import os, time
from flask import current_app

workspaces_logo_bp = Blueprint('workspaces_logo', __name__)

@workspaces_logo_bp.route('/<int:workspace_id>/logo', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required(optional=True)
def upload_workspace_logo(workspace_id):
    """
    Robust Workspace Logo Jurisdiction (The Tenant Brand)
    Instruction: Resolve CORS Preflight failure and ensure cloud persistence.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    uid = get_jwt_identity()
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401
        
    try:
        from app.utils.logger import logger
        logger.info(f"🚀 Starting logo upload for workspace {workspace_id}")
        user = User.query.get(uid)
        
        if not user:
            logger.warning(f"User {uid} not found during logo upload")
            return jsonify({'error': 'User not found', 'success': False}), 404
            
        # Tiered Jurisdiction Check
        is_super = user.role == "super_admin" or getattr(user, 'platform_role', '') == 'SUPER_ADMIN'
        if not is_super and int(user.workspace_id) != int(workspace_id):
            logger.warning(f"Jurisdiction Denied for user {uid} on workspace {workspace_id}")
            return jsonify({'error': 'Jurisdiction Denied', 'success': False}), 403
            
        workspace = Workspace.query.get(workspace_id)
        if not workspace:
            logger.warning(f"Workspace {workspace_id} not found")
            return jsonify({'error': 'Workspace not found', 'success': False}), 404
            
        if 'file' not in request.files:
            return jsonify({'error': 'No file part', 'success': False}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file', 'success': False}), 400

        # Step A: Persistent Cloud Upload
        from app.utils.uploads import save_logo, allowed_file, ALLOWED_EXTENSIONS
        filename = f'logo_ws_{workspace_id}.png'
        file.seek(0)
        input_filename = getattr(file, 'filename', '')
        if not input_filename:
            logger.warning("save_logo called with file having no filename")
            return jsonify({'error': 'No filename provided', 'success': False}), 400
        
        # MIME Type and Extension Integrity
        ext = input_filename.rsplit('.', 1)[1].lower() if '.' in input_filename else ''
        logger.info(f"🔍 Analyzing file: {input_filename} (Ext: {ext}, Type: {getattr(file, 'content_type', 'unknown')})")

        if not allowed_file(input_filename):
            logger.warning(f"❌ File extension '{ext}' not in permitted list: {ALLOWED_EXTENSIONS}")
            return jsonify({'error': 'Invalid file type', 'success': False}), 400

        logger.info(f"☁️ Uploading to cloud: {filename}")
        logo_url = save_logo(file, folder='workspaces', filename=filename)
        
        if not logo_url:
            logger.error(f"Failed to save logo for workspace {workspace_id}")
            return jsonify({'error': 'Failed to save logo', 'success': False}), 500

        # Step B: Persistent Backup in DB settings (survives storage wipes)
        try:
            import base64
            from PIL import Image
            import io
            
            logger.info("📸 Creating persistent B64 backup")
            file.seek(0)
            file_data = file.read()
            if file_data:
                # Use a separate try-except for Image processing to avoid crashing the whole request
                try:
                    img = Image.open(io.BytesIO(file_data))
                    # Ensure we handle various modes (RGBA -> RGB for some formats)
                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")
                    img.thumbnail((400, 400))
                    buffered = io.BytesIO()
                    img.save(buffered, format="JPEG", quality=85) # Use JPEG for backup to save space
                    b64_logo = base64.b64encode(buffered.getvalue()).decode('utf-8')
                    
                    settings = workspace.get_settings()
                    settings['logo_persistent_backup'] = f"data:image/jpeg;base64,{b64_logo}"
                    workspace.set_settings(settings)
                except Exception as img_err:
                    logger.error(f"Image processing failed: {img_err}")
                    # Non-fatal, continue with the main upload
        except Exception as bkp_err:
            logger.warning(f"Persistent backup warning: {bkp_err}")

        # Step C: Update DB
        workspace.logo_url = logo_url
        db.session.commit()
        logger.info(f"✅ Logo updated successfully: {logo_url}")
        
        # Step D: Return the Full URL with cache-buster
        cache_buster = int(time.time())
        if logo_url.startswith('http'):
            final_url = f"{logo_url}{'&' if '?' in logo_url else '?'}v={cache_buster}"
        else:
            final_url = f"{request.host_url.rstrip('/')}{logo_url}?v={cache_buster}"
        
        # Real-time Notification
        try:
            socketio.emit('workspace_branding_updated', {
                'workspace_id': workspace_id,
                'logo_url': final_url
            }, room=f'workspace_{workspace_id}')
        except Exception as sock_err:
            logger.warning(f"Socket emit failed: {sock_err}")
        
        return jsonify({
            'success': True,
            'message': 'Workspace logo updated successfully',
            'logo_url': final_url
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        from app.utils.supabase import handle_supabase_error
        return handle_supabase_error(e)
