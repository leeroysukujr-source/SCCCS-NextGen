from flask import Blueprint, request, jsonify
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models import User, Workspace, WorkspaceMembership, StudentProfile, WorkspaceIdentityPolicy
from datetime import datetime
from app.models.security import AuditLog
from app.utils.middleware import platform_super_admin_required, workspace_required
import json

workspace_bp = Blueprint('workspace', __name__)

def super_admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if user.role != 'super_admin':
            return jsonify({'error': 'Super Admin access required'}), 403
        return f(*args, **kwargs)
    return wrapper

def workspace_access_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        ws_id = kwargs.get('ws_id')
        uid = get_jwt_identity()
        user = User.query.get(uid)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Super Admins have global access
        if user.effective_role == 'super_admin':
            return f(*args, **kwargs)
            
        # Workspace Admins have access to THEIR workspace only
        if user.effective_role == 'admin' and int(user.workspace_id) == int(ws_id):
            return f(*args, **kwargs)
            
        return jsonify({'error': 'Unauthorized access to this workspace'}), 403
    return wrapper

@workspace_bp.route('', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def list_workspaces():
    """List all workspaces"""
    workspaces = Workspace.query.all()
    return jsonify([w.to_dict() for w in workspaces]), 200

@workspace_bp.route('/<int:ws_id>', methods=['GET'])
@jwt_required()
@workspace_access_required
def get_workspace(ws_id):
    """Get single workspace details"""
    workspace = Workspace.query.get_or_404(ws_id)
    return jsonify(workspace.to_dict()), 200

@workspace_bp.route('/search', methods=['GET'])
@jwt_required(optional=True)
def search_workspaces():
    """Search for a workspace by name or slug (Public)"""
    query = request.args.get('q', '').strip()
    if not query:
        # Return few featured/recent ones instead of empty if no query
        workspaces = Workspace.query.limit(10).all()
    else:
        workspaces = Workspace.query.filter(
            (Workspace.name.ilike(f'%{query}%')) | 
            (Workspace.slug.ilike(f'%{query}%'))
        ).limit(10).all()
        
    return jsonify([
        {
            'id': w.id,
            'name': w.name,
            'slug': w.slug,
            'logo_url': w.logo_url,
            'description': w.description,
            'code_hint': w.code[:4] + '****' if w.code else None # Secure hint
        } for w in workspaces
    ]), 200

@workspace_bp.route('/join', methods=['POST'])
@jwt_required()
def join_workspace():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        data = request.get_json()
        
        code = data.get('code')
        role = data.get('role', 'student') # student, teacher, etc.
        
        # Security: Prevent self-assigning Admin role
        if role == 'admin':
            role = 'student'
            
        reg_no = data.get('reg_no')
        
        if not code:
            return jsonify({'error': 'Workspace code is required'}), 400
            
        # Find workspace (case insensitive)
        workspace = Workspace.query.filter(Workspace.code.ilike(code)).first()
        if not workspace:
            return jsonify({'error': 'Invalid workspace code'}), 404
            
        # Check if already a member
        membership = WorkspaceMembership.query.filter_by(user_id=user.id, workspace_id=workspace.id).first()
        if membership:
            # Already a member - switch to it
            user.workspace_id = workspace.id
            if user.role != 'super_admin' and user.id != workspace.admin_id:
                user.role = membership.role
            db.session.commit()
            
            return jsonify({
                'message': 'Welcome back! You have entered the workspace.',
                'workspace': workspace.to_dict()
            }), 200

        # Policy Check
        policy = workspace.identity_policy
        if role == 'student':
            if policy and policy.require_regno and not reg_no:
                 return jsonify({'error': 'Registration Number (RegNo) is required for this workspace'}), 400
                 
            if reg_no:
                # Check uniqueness of RegNo in this workspace
                existing_profile = StudentProfile.query.filter_by(workspace_id=workspace.id, reg_no=reg_no).first()
                if existing_profile and existing_profile.user_id != user.id:
                    return jsonify({'error': 'This Registration Number is already in use by another user.'}), 409
                    
        # Create Membership
        membership = WorkspaceMembership(
            user_id=user.id,
            workspace_id=workspace.id,
            role=role,
            status='active' 
        )
        db.session.add(membership)
        
        # Create Student Profile if needed
        if role == 'student' and reg_no:
            profile = StudentProfile(
                user_id=user.id,
                workspace_id=workspace.id,
                reg_no=reg_no,
                verification_status='verified' # Default to verified for now if code matches
            )
            db.session.add(profile)
            
        # Set as active workspace
        user.workspace_id = workspace.id
        if user.role != 'super_admin' and user.id != workspace.admin_id:
            user.role = role
            
        db.session.commit()
        
        return jsonify({
            'message': 'Successfully joined workspace',
            'workspace': workspace.to_dict()
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@workspace_bp.route('/exit', methods=['POST'])
@jwt_required()
def exit_workspace():
    """Exit current workspace context"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    # Clear current workspace focus
    user.workspace_id = None
    db.session.commit()
    
    return jsonify({'message': 'Exited workspace context'}), 200

@workspace_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_workspaces():
    """List workspaces the user is a member of"""
    try:
        current_user_id = get_jwt_identity()
        memberships = WorkspaceMembership.query.filter_by(user_id=current_user_id).all()
        
        results = []
        for m in memberships:
            ws = m.workspace
            if ws:
                d = ws.to_dict()
                # Enforce admin role for owner
                d['my_role'] = 'admin' if ws.admin_id == int(current_user_id) else m.role
                results.append(d)
                
        return jsonify(results), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@workspace_bp.route('', methods=['POST'])
@jwt_required()
@platform_super_admin_required
def create_workspace():
    """Create a new workspace"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'error': 'Workspace name is required'}), 400
            
        # 1. SLUG GENERATION (If missing)
        slug = data.get('slug', '').strip()
        if not slug:
            # Generate slug from name: "SCCCS Test" -> "scccs-test"
            import re
            slug = re.sub(r'[^a-zA-Z0-9]', '-', name.lower())
            slug = re.sub(r'-+', '-', slug).strip('-')
        
        # 2. UNIQUE SLUG CHECK
        if Workspace.query.filter(Workspace.slug.ilike(slug)).first():
            return jsonify({'error': f'A workspace with slug "{slug}" already exists'}), 400
            
        # 3. CODE GENERATION
        code = data.get('code', '').strip()
        if not code:
            import secrets
            import string
            while True:
                suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
                candidate = f"WS-{suffix}"
                if not Workspace.query.filter_by(code=candidate).first():
                    code = candidate
                    break
        else:
            if Workspace.query.filter(Workspace.code.ilike(code)).first():
                return jsonify({'error': 'Workspace code already exists'}), 400

        # 4. ADMIN ID NORMALIZATION (Type safety for PostgreSQL)
        admin_id_val = data.get('admin_id')
        if admin_id_val is None or str(admin_id_val).strip() == "" or str(admin_id_val).lower() == "undefined":
            admin_id = None
        else:
            try:
                admin_id = int(admin_id_val)
            except (ValueError, TypeError):
                admin_id = None

        # 5. INSTANTIATION
        workspace = Workspace(
            name=name,
            slug=slug,
            code=code,
            description=data.get('description', ''),
            admin_id=admin_id,
            logo_url=data.get('logo_url'),
            status='active'
        )
        
        db.session.add(workspace)
        db.session.commit()
        
        # 5. AUDIT LOGGING
        try:
            current_user_id = get_jwt_identity()
            log = AuditLog(
                user_id=current_user_id,
                action='create_workspace',
                resource_type='workspace',
                resource_id=workspace.id,
                details_data=json.dumps({'name': workspace.name, 'slug': workspace.slug}),
                status='success'
            )
            db.session.add(log)
            db.session.commit()
        except Exception as audit_err:
            print(f"Audit log failed (non-critical): {audit_err}")
        
        return jsonify({
            'message': 'Workspace created successfully',
            'workspace': workspace.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"WORKSPACE CREATION ERROR: {str(e)}\n{error_trace}")
        return jsonify({
            'error': 'Internal server error during workspace creation',
            'details': str(e)
        }), 500

@workspace_bp.route('/<int:ws_id>', methods=['PUT'])
@jwt_required()
@workspace_access_required
def update_workspace(ws_id):
    """Update workspace details"""
    workspace = Workspace.query.get(ws_id)
    if not workspace:
        return jsonify({'error': 'Workspace not found'}), 404
        
    data = request.get_json()
    
    if 'name' in data:
        workspace.name = data['name']
    if 'description' in data:
        workspace.description = data['description']
    if 'admin_id' in data:
        workspace.admin_id = data['admin_id']
        
    db.session.commit()
    return jsonify({'message': 'Workspace updated successfully', 'workspace': workspace.to_dict()}), 200



@workspace_bp.route('/<int:ws_id>/settings', methods=['PATCH'])
@jwt_required()
@workspace_access_required
def update_workspace_branding(ws_id):
    """Update workspace branding settings"""
    workspace = Workspace.query.get(ws_id)
    if not workspace:
        return jsonify({'error': 'Workspace not found'}), 404
        
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Data required'}), 400
        
    current_settings = workspace.get_settings()
    current_settings.update(data)
    workspace.set_settings(current_settings)
    
    db.session.commit()
    
    # Notify users in this workspace about branding update
    socketio.emit('workspace_branding_updated', {
        'workspace_id': ws_id,
        'settings': workspace.get_settings()
    }, room=f'workspace_{ws_id}')
    
    return jsonify({'message': 'Branding updated', 'workspace': workspace.to_dict()}), 200

@workspace_bp.route('/<int:ws_id>/config', methods=['PATCH'])
@jwt_required()
@workspace_access_required
def update_workspace_config(ws_id):
    """Update granular workspace-specific settings (overrides for global settings)"""
    workspace = Workspace.query.get(ws_id)
    if not workspace:
        return jsonify({'error': 'Workspace not found'}), 404
        
    data = request.get_json()
    if not data or 'key' not in data or 'value' not in data:
        return jsonify({'error': 'Key and value are required'}), 400
        
    current_settings = workspace.get_settings()
    current_settings[data['key']] = data['value']
    workspace.set_settings(current_settings)
    
    db.session.commit()
    
    # Notify users in this workspace about setting update
    socketio.emit('workspace_setting_updated', {
        'workspace_id': ws_id,
        'key': data['key'],
        'value': data['value']
    }, room=f'workspace_{ws_id}')
    
    return jsonify({
        'message': f'Setting {data["key"]} updated for workspace',
        'key': data['key'],
        'value': data['value']
    }), 200

@workspace_bp.route('/<int:ws_id>/stats', methods=['GET'])
@jwt_required()
@workspace_access_required
def get_workspace_stats(ws_id):
    """Get statistics for a specific workspace"""
    workspace = Workspace.query.get(ws_id)
    if not workspace:
        return jsonify({'error': 'Workspace not found'}), 404
        
    from app.models import User, Class, Channel, Room
    
    student_count = User.query.filter_by(workspace_id=ws_id, role='student').count()
    teacher_count = User.query.filter_by(workspace_id=ws_id, role='teacher').count()
    admin_count = User.query.filter_by(workspace_id=ws_id, role='admin').count()
    class_count = Class.query.filter_by(workspace_id=ws_id).count()
    channel_count = Channel.query.filter_by(workspace_id=ws_id).count()
    room_count = Room.query.filter_by(workspace_id=ws_id).count()
    
    return jsonify({
        'workspace_id': ws_id,
        'workspace_name': workspace.name,
        'stats': {
            'students': student_count,
            'lecturers': teacher_count,
            'staff': teacher_count + admin_count,
            'classes': class_count,
            'channels': channel_count,
            'rooms': room_count,
            'total_users': student_count + teacher_count + admin_count
        }
    }), 200

@workspace_bp.route('/<int:ws_id>/match-users', methods=['POST'])
@jwt_required()
@workspace_access_required
def match_users(ws_id):
    """Match a list of emails/usernames to Users in the workspace"""
    data = request.get_json()
    identifiers = data.get('identifiers', []) # List of emails or usernames
    
    if not identifiers:
        return jsonify([]), 200
        
    users = User.query.filter(
        User.workspace_id == ws_id,
        (User.email.in_(identifiers)) | (User.username.in_(identifiers))
    ).all()
    
    matched = []
    for u in users:
         matched.append({
             'id': u.id,
             'email': u.email,
             'username': u.username,
             'first_name': u.first_name,
             'last_name': u.last_name,
             'avatar_url': u.avatar_url
         })
         
    return jsonify(matched), 200
