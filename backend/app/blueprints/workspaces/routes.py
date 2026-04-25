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
        user = User.query.get(uid)
        
        if not user:
            return jsonify({'error': 'User not found', 'success': False}), 404
            
        # Tiered Jurisdiction Check
        is_super = user.role == "super_admin" or getattr(user, 'platform_role', '') == 'SUPER_ADMIN'
        if not is_super and int(user.workspace_id) != int(workspace_id):
            return jsonify({'error': 'Jurisdiction Denied', 'success': False}), 403
            
        workspace = Workspace.query.get(workspace_id)
        if not workspace:
            return jsonify({'error': 'Workspace not found', 'success': False}), 404
            
        if 'file' not in request.files:
            return jsonify({'error': 'No file part', 'success': False}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file', 'success': False}), 400

        # Step A: Persistent Cloud Upload
        from app.utils.uploads import save_logo
        filename = f'logo_ws_{workspace_id}.png'
        file.seek(0)
        logo_url = save_logo(file, folder='workspaces', filename=filename)
        
        if not logo_url:
            return jsonify({'error': 'Failed to save logo', 'success': False}), 500

        # Step B: Persistent Backup in DB settings
        try:
            import base64
            from PIL import Image
            import io
            
            file.seek(0)
            file_data = file.read()
            img = Image.open(io.BytesIO(file_data))
            img.thumbnail((400, 400))
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            b64_logo = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            settings = workspace.get_settings()
            settings['logo_persistent_backup'] = f"data:image/png;base64,{b64_logo}"
            workspace.set_settings(settings)
        except Exception as e:
            print(f"[Tenant Brand] Persistent backup warning: {e}")

        # Step C: Update DB
        workspace.logo_url = logo_url
        db.session.commit()
        
        # Step D: Return the Full URL with cache-buster
        cache_buster = int(time.time())
        if logo_url.startswith('http'):
            final_url = f"{logo_url}{'&' if '?' in logo_url else '?'}v={cache_buster}"
        else:
            final_url = f"{request.host_url.rstrip('/')}{logo_url}?v={cache_buster}"
        
        # Real-time Notification
        socketio.emit('workspace_branding_updated', {
            'workspace_id': workspace_id,
            'logo_url': final_url
        }, room=f'workspace_{workspace_id}')
        
        return jsonify({
            'success': True,
            'message': 'Workspace logo updated successfully',
            'logo_url': final_url
        }), 200

    except Exception as e:
        db.session.rollback()
        from app.utils.supabase import handle_supabase_error
        print(f"[Tenant Brand] CRITICAL CRASH: {e}")
        return handle_supabase_error(e)
