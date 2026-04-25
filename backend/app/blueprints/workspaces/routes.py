from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models import Workspace, User
from flask_cors import cross_origin
import time
from app.utils.logger import logger

workspaces_logo_bp = Blueprint('workspaces_logo', __name__)

@workspaces_logo_bp.route('/<int:workspace_id>/logo', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_workspace_logo_url(workspace_id):
    """
    Refactored: Update URL endpoint (Transition to Supabase Direct)
    Instruction: Accept JSON body with 'logo_url' and update DB.
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
            
        # Support both JSON (Cloud Sync) and Multipart (Local Fallback)
        logo_url = None
        if request.is_json:
            data = request.get_json()
            logo_url = data.get('logo_url')
        elif 'file' in request.files:
            from app.utils.uploads import save_logo
            file = request.files['file']
            logo_url = save_logo(file, folder='workspaces', filename=f'logo_ws_{workspace_id}.png')
        
        if not logo_url:
            return jsonify({'error': 'Missing logo_url or file in request', 'success': False}), 400

        logger.info(f"💾 Updating Workspace {workspace_id} logo to: {logo_url}")

        # Step A: Update DB
        workspace.logo_url = logo_url
        
        # Step B: Persistent Backup Sync (Optional but recommended for resilience)
        try:
            settings = workspace.get_settings()
            settings['logo_last_updated'] = int(time.time())
            workspace.set_settings(settings)
        except: pass
        
        db.session.commit()
        
        # Step C: Real-time Notification
        try:
            socketio.emit('workspace_branding_updated', {
                'workspace_id': workspace_id,
                'logo_url': logo_url
            }, room=f'workspace_{workspace_id}')
        except: pass
        
        return jsonify({
            'success': True,
            'message': 'Workspace branding updated successfully',
            'logo_url': logo_url
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Failed to update workspace logo URL: {e}")
        return jsonify({'error': str(e), 'success': False}), 500
