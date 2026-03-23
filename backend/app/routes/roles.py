from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Role, Permission, User, Workspace, role_permissions
from app import db
from app.utils.scoping import scope_query, get_current_workspace_id
from app.utils.decorators import permission_required
from app.utils.logger import log_info, log_error

roles_bp = Blueprint('roles', __name__)

@roles_bp.route('/', methods=['GET'])
@jwt_required()
@permission_required('manage_users')
def list_roles():
    """List roles in current workspace"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    workspace_id = user.workspace_id
    if not workspace_id and user.role != 'super_admin':
        return jsonify({'error': 'No workspace context'}), 400
        
    roles = Role.query.filter(
        (Role.workspace_id == workspace_id) | (Role.workspace_id == None)
    ).all()
    
    return jsonify([r.to_dict() for r in roles]), 200

@roles_bp.route('/<int:role_id>', methods=['PUT'])
@jwt_required()
@permission_required('manage_workspace')
def update_role_permissions(role_id):
    """Update permissions for a role"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    role = Role.query.get(role_id)
    if not role:
        return jsonify({'error': 'Role not found'}), 404
        
    # Security: Ensure role belongs to user's workspace
    if role.workspace_id and role.workspace_id != user.workspace_id and user.role != 'super_admin':
        return jsonify({'error': 'Access denied'}), 403
        
    # Global roles cannot be edited by workspace admins
    if not role.workspace_id and user.role != 'super_admin':
        return jsonify({'error': 'Cannot edit global roles'}), 403
        
    data = request.get_json()
    permission_names = data.get('permissions', [])
    
    # Resolve permissions
    new_perms = []
    for pname in permission_names:
        perm = Permission.query.filter_by(name=pname).first()
        if perm:
            new_perms.append(perm)
            
    role.permissions = new_perms
    db.session.commit()
    
    log_info(f"Role permissions updated: {role.name} by {user.username}")
    return jsonify(role.to_dict()), 200

@roles_bp.route('/users/<int:target_user_id>/assign', methods=['POST'])
@jwt_required()
@permission_required('manage_users')
def assign_role_to_user(target_user_id):
    """Assign a role to a user within the workspace"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
        
    # Scope check
    if target_user.workspace_id != user.workspace_id and user.role != 'super_admin':
        return jsonify({'error': 'User not in your workspace'}), 403
        
    data = request.get_json()
    role_id = data.get('role_id')
    
    role = Role.query.get(role_id)
    if not role:
         return jsonify({'error': 'Role not found'}), 404
    
    # Role scope check     
    if role.workspace_id and role.workspace_id != user.workspace_id and user.role != 'super_admin':
         return jsonify({'error': 'Role not in your workspace'}), 403
         
    # Assign (replace existing or append? Let's append but usually strict role means one primary? 
    # For RBAC, multiple roles are fine. But let's check duplicates)
    if role not in target_user.roles:
        target_user.roles.append(role)
        db.session.commit()
        
    return jsonify({'message': 'Role assigned', 'user_roles': [r.name for r in target_user.roles]}), 200

@roles_bp.route('/permissions', methods=['GET'])
@jwt_required()
def list_permissions():
    """List all available permissions"""
    perms = Permission.query.all()
    return jsonify([{'id': p.id, 'name': p.name, 'description': p.description} for p in perms]), 200
