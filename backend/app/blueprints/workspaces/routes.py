from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models import Workspace, User
from app.utils.uploads import save_logo

workspaces_logo_bp = Blueprint('workspaces_logo', __name__)

@workspaces_logo_bp.route('/<int:workspace_id>/logo', methods=['POST'])
@jwt_required()
def upload_workspace_logo(workspace_id):
    """
    Workspace Logo Jurisdiction (The Tenant Brand)
    Instruction: Ensure the Workspace Admin can only upload a logo for their own workspace_id.
    """
    uid = get_jwt_identity()
    user = User.query.get(uid)
    
    if not user:
        return jsonify({'error': 'User not found', 'success': False}), 404
        
    # Tiered Jurisdiction Check
    is_super = user.role == "super_admin" or getattr(user, 'platform_role', '') == 'SUPER_ADMIN'
    # Instruction: Ensure the Workspace Admin can only upload a logo for their own workspace_id.
    if not is_super and int(user.workspace_id) != int(workspace_id):
        return jsonify({'error': 'Jurisdiction Denied: Unauthorized access to this workspace branding', 'success': False}), 403
        
    workspace = Workspace.query.get(workspace_id)
    if not workspace:
        return jsonify({'error': 'Workspace not found', 'success': False}), 404
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file parts', 'success': False}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file', 'success': False}), 400
    
    # Action: Save the file using a workspace-specific naming convention: logo_ws_{workspace_id}.png.
    final_filename = f'logo_ws_{workspace_id}.png'
    logo_url = save_logo(file, folder='workspaces', filename=final_filename)
    
    if not logo_url:
        return jsonify({'error': 'Failed to save workspace logo', 'success': False}), 500
        
    # Action: Update the Workspace model's logo_url field.
    workspace.logo_url = logo_url
    db.session.commit()
    
    # Real-time Notification
    socketio.emit('workspace_branding_updated', {
        'workspace_id': workspace_id,
        'logo_url': logo_url
    }, room=f'workspace_{workspace_id}')
    
    print(f"[Tenant Brand] Logo updated for workspace {workspace_id}: {logo_url}")

    # Action: Return the new URL to the frontend so the Sidebar updates immediately.
    return jsonify({
        'success': True,
        'message': 'Workspace logo updated successfully',
        'logo_url': logo_url,
        'full_url': logo_url
    }), 200
