from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models import Workspace, User
from flask_cors import cross_origin
import os, time
from flask import current_app

workspaces_logo_bp = Blueprint('workspaces_logo', __name__)

@workspaces_logo_bp.route('/<int:workspace_id>/logo', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["https://scccs-next-gen-nine.vercel.app", "https://scccs-next-gen.vercel.app", "https://scccs-nextgen-q2ll.onrender.com"], allow_headers=['Authorization', 'Content-Type'])
@jwt_required()
def upload_workspace_logo(workspace_id):
    """
    Robust Workspace Logo Jurisdiction (The Tenant Brand)
    Instruction: Resolve CORS Preflight failure and ensure multipart handling.
    Save file to: static/uploads/workspaces/logo_ws_{workspace_id}.png
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        uid = get_jwt_identity()
        user = User.query.get(uid)
        
        if not user:
            return jsonify({'error': 'User not found', 'success': False}), 404
            
        # Tiered Jurisdiction Check
        is_super = user.role == "super_admin" or getattr(user, 'platform_role', '') == 'SUPER_ADMIN'
        if not is_super and int(user.workspace_id) != int(workspace_id):
            return jsonify({'error': 'Jurisdiction Denied: Unauthorized access to this workspace branding', 'success': False}), 403
            
        workspace = Workspace.query.get(workspace_id)
        if not workspace:
            return jsonify({'error': 'Workspace not found', 'success': False}), 404
            
        if 'file' not in request.files:
            return jsonify({'error': 'No file part', 'success': False}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file', 'success': False}), 400

        # Step A: Explicitly ensure the workspaces branding directory exists and has permissions
        static_folder = current_app.static_folder or os.path.join(current_app.root_path, 'static')
        workspaces_path = os.path.join(static_folder, 'uploads', 'workspaces')
        
        if not os.path.exists(workspaces_path):
            os.makedirs(workspaces_path, mode=0o755, exist_ok=True)
        else:
            try: os.chmod(workspaces_path, 0o755)
            except: pass

        # Step B: Save file using workspace-specific convention
        filename = f'logo_ws_{workspace_id}.png'
        target_path = os.path.join(workspaces_path, filename)
        file.save(target_path)
        
        # Step C: Update DB
        logo_url = f"/static/uploads/workspaces/{filename}"
        workspace.logo_url = logo_url
        db.session.commit()
        
        # Step D: Return the Full URL with cache-buster for immediate Sidebar update
        cache_buster = int(time.time())
        full_url = f"{request.host_url.rstrip('/')}{logo_url}?v={cache_buster}"
        
        # Real-time Notification for other members of the same workspace
        socketio.emit('workspace_branding_updated', {
            'workspace_id': workspace_id,
            'logo_url': full_url
        }, room=f'workspace_{workspace_id}')
        
        print(f"[Tenant Brand] Logo updated for workspace {workspace_id}: {full_url}")

        return jsonify({
            'success': True,
            'message': 'Workspace logo updated successfully',
            'logo_url': full_url,
            'full_url': full_url
        }), 200

    except Exception as e:
        print(f"[Tenant Brand] CRITICAL CRASH in upload_workspace_logo: {e}")
        return jsonify({'error': str(e), 'success': False}), 500
