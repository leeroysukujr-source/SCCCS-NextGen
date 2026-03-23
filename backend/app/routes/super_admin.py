from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, TwoFactorAudit, Workspace, Role, WorkspaceMembership
from app.models.security import AuditLog
from app.utils.roles import is_super_admin
from app.utils.middleware import platform_super_admin_required
from functools import wraps
import json

super_admin_bp = Blueprint('super_admin', __name__)

# Centrally imported from app.utils.middleware as platform_super_admin_required

@super_admin_bp.route('/admins', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def list_admins():
    """List all admin users with workspace-wide role counts"""
    admins = User.query.filter(User.role.ilike('admin')).all()
    
    admin_list = []
    for admin in admins:
        d = admin.to_dict()
        
        # If admin belongs to a workspace, show counts for that institution
        if admin.workspace_id:
            ws = Workspace.query.get(admin.workspace_id)
            if ws:
                d['workspace_name'] = ws.name
                d['workspace_slug'] = ws.slug
                # Override counts with workspace-wide totals
                d['staff_count'] = User.query.filter_by(workspace_id=ws.id, role='teacher').count()
                d['student_count'] = User.query.filter_by(workspace_id=ws.id, role='student').count()
                d['admin_count'] = User.query.filter_by(workspace_id=ws.id, role='admin').count()
        else:
            # Fallback to counts linked specifically to this admin ID (legacy or direct link)
            d['staff_count'] = User.query.filter_by(admin_id=admin.id, role='teacher').count()
            d['student_count'] = User.query.filter_by(admin_id=admin.id, role='student').count()
            d['admin_count'] = 1 # Just themselves
            
        admin_list.append(d)
        
    return jsonify(admin_list), 200

@super_admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def get_stats():
    """Get system-wide statistics for Super Admin"""
    stats = {
        'total_admins': User.query.filter(User.role.ilike('admin')).count(),
        'total_teachers': User.query.filter(User.role.ilike('teacher')).count(),
        'total_students': User.query.filter(User.role.ilike('student')).count(),
        'total_workspaces': Workspace.query.count(),
        'active_users': User.query.filter_by(is_active=True).count(),
        'total_logs': TwoFactorAudit.query.count() + AuditLog.query.count()
    }
    return jsonify(stats), 200

@super_admin_bp.route('/workspaces/<int:ws_id>/analytics', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def get_workspace_analytics(ws_id):
    """Get detailed analytics for a specific workspace"""
    ws = Workspace.query.get_or_404(ws_id)
    
    # Granular data
    admins = User.query.filter_by(workspace_id=ws_id, role='admin').all()
    teachers = User.query.filter_by(workspace_id=ws_id, role='teacher').all()
    students = User.query.filter_by(workspace_id=ws_id, role='student').all()
    
    active_count = User.query.filter_by(workspace_id=ws_id, is_active=True).count()
    inactive_count = User.query.filter_by(workspace_id=ws_id, is_active=False).count()
    
    # Audit Logs for THIS workspace
    # Filter logs where user_id belongs to this workspace
    ws_user_ids = [u.id for u in User.query.filter_by(workspace_id=ws_id).all()]
    recent_logs = []
    if ws_user_ids:
        # Get both TwoFactorAudit and AuditLog
        tf_audits = TwoFactorAudit.query.filter(TwoFactorAudit.user_id.in_(ws_user_ids)).order_by(TwoFactorAudit.created_at.desc()).limit(10).all()
        general_audits = AuditLog.query.filter(AuditLog.user_id.in_(ws_user_ids)).order_by(AuditLog.created_at.desc()).limit(10).all()
        
        combined_ws_logs = []
        for l in tf_audits:
            d = l.to_dict()
            d['log_type'] = 'security'
            combined_ws_logs.append(d)
        for l in general_audits:
            d = l.to_dict()
            d['log_type'] = 'audit'
            combined_ws_logs.append(d)
            
        # Sort and limit
        combined_ws_logs.sort(key=lambda x: x['created_at'], reverse=True)
        recent_logs = combined_ws_logs[:10]

    analytics = {
        'workspace': ws.to_dict(),
        'stats': {
            'admins': len(admins),
            'staff': len(teachers),
            'students': len(students),
            'active': active_count,
            'inactive': inactive_count
        },
        'lists': {
            'admins': [a.username for a in admins],
            'recent_activity': recent_logs
        }
    }
    
    return jsonify(analytics), 200

@super_admin_bp.route('/admins', methods=['POST'])
@jwt_required()
@platform_super_admin_required
def create_admin():
    """Create a new admin account or promote an existing user"""
    import secrets
    data = request.get_json()
    
    email = (data.get('email') or '').strip().lower()
    username = (data.get('username') or '').strip()
    workspace_id = data.get('workspace_id')
    
    if not email or not username:
        return jsonify({'error': 'Email and username are required'}), 400
    
    # Check if user already exists
    existing_user = User.query.filter(
        (User.email == email) | (User.username == username)
    ).first()
    
    admin = existing_user
    is_new = False
    password = data.get('password')
    temp_password = None
    
    if not admin:
        # Create new user
        admin = User(
            username=username,
            email=email,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            role='admin',
            workspace_id=workspace_id
        )
        if not password:
            temp_password = secrets.token_urlsafe(12)
            admin.set_password(temp_password)
        else:
            admin.set_password(password)
        
        db.session.add(admin)
        is_new = True
    else:
        # Promote existing user
        # Check if they already have the role and workspace
        if admin.role == 'admin' and admin.workspace_id == workspace_id:
            # Check if membership also exists
            m = WorkspaceMembership.query.filter_by(user_id=admin.id, workspace_id=workspace_id).first()
            if m and m.role == 'admin':
                return jsonify({'error': 'User is already an admin for this workspace'}), 400
        
        # Update user
        admin.role = 'admin'
        if workspace_id:
            admin.workspace_id = workspace_id
        
        # Optionally update names if provided
        if data.get('first_name'): admin.first_name = data.get('first_name')
        if data.get('last_name'): admin.last_name = data.get('last_name')
        
    db.session.flush() # Ensure we have admin.id
    
    # Ensure Workspace Membership exists
    if workspace_id:
        membership = WorkspaceMembership.query.filter_by(
            user_id=admin.id, 
            workspace_id=workspace_id
        ).first()
        
        if not membership:
            membership = WorkspaceMembership(
                user_id=admin.id,
                workspace_id=workspace_id,
                role='admin',
                status='active'
            )
            db.session.add(membership)
        else:
            membership.role = 'admin'
            membership.status = 'active'
            
    db.session.commit()
    
    # Audit Log
    try:
        current_user_id = get_jwt_identity()
        log = AuditLog(
            user_id=current_user_id,
            action='create_admin' if is_new else 'promote_to_admin',
            resource_type='user',
            resource_id=admin.id,
            details_data=json.dumps({
                'username': admin.username, 
                'email': admin.email, 
                'workspace_id': workspace_id,
                'is_new': is_new
            }),
            status='success'
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Audit log failed: {e}")
    
    return jsonify({
        'message': 'Admin created successfully' if is_new else 'User promoted to Admin successfully',
        'admin': admin.to_dict(),
        'temporary_password': temp_password
    }), 201

@super_admin_bp.route('/admins/<int:admin_id>', methods=['PUT'])
@jwt_required()
@platform_super_admin_required
def update_admin(admin_id):
    """Update an admin account"""
    admin = User.query.get(admin_id)
    if not admin or admin.role != 'admin':
        return jsonify({'error': 'Admin not found'}), 404
    
    data = request.get_json()
    
    if 'first_name' in data:
        admin.first_name = data['first_name']
    if 'last_name' in data:
        admin.last_name = data['last_name']
    if 'email' in data:
        # Check uniqueness
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != admin_id:
            return jsonify({'error': 'Email already in use'}), 400
        admin.email = data['email']
    if 'is_active' in data:
        admin.is_active = data['is_active']
    if 'role' in data and data['role'] in ['admin', 'teacher', 'student']:
        admin.role = data['role']
    if 'workspace_id' in data:
        admin.workspace_id = data['workspace_id']
    
    db.session.commit()
    return jsonify({'message': 'Admin updated successfully', 'admin': admin.to_dict()}), 200



@super_admin_bp.route('/logs', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def list_logs():
    """List system audit logs (focused on admins/security)"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
    except ValueError:
        page = 1
        per_page = 50
        
    # Combined logs from TwoFactorAudit and AuditLog
    two_factor_logs = TwoFactorAudit.query.all()
    general_logs = AuditLog.query.all()
    
    combined = []
    for l in two_factor_logs:
        d = l.to_dict()
        d['log_type'] = 'security'
        combined.append(d)
        
    for l in general_logs:
        d = l.to_dict()
        d['log_type'] = 'audit'
        # Normalize details for UI
        if 'details' in d:
             d['details_str'] = str(d['details'])
        combined.append(d)
        
    # Sort by created_at desc
    combined.sort(key=lambda x: x['created_at'], reverse=True)
    
    # Simple pagination on the combined list
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_logs = combined[start_idx:end_idx]
    
    # Enrich with user info
    for log_dict in paginated_logs:
        if log_dict.get('user_id'):
            user = User.query.get(log_dict['user_id'])
            if user:
                log_dict['username'] = user.username
        
    return jsonify({
        'items': paginated_logs,
        'total': len(combined),
        'page': page,
        'pages': (len(combined) + per_page - 1) // per_page
    }), 200

@super_admin_bp.route('/roles', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def list_roles():
    """List all available global roles"""
    roles = Role.query.filter_by(workspace_id=None).all()
    return jsonify([r.to_dict() for r in roles]), 200

@super_admin_bp.route('/admins/<int:admin_id>/roles', methods=['PUT'])
@jwt_required()
@platform_super_admin_required
def assign_admin_roles(admin_id):
    """Assign granular roles to an admin"""
    admin = User.query.get_or_404(admin_id)
    
    data = request.get_json()
    role_ids = data.get('role_ids', [])
    
    # Verify roles exist and are global
    roles = Role.query.filter(Role.id.in_(role_ids), Role.workspace_id == None).all()
    
    admin.roles = roles
    db.session.commit()
    
    return jsonify({'message': 'Roles updated', 'roles': [r.name for r in admin.roles]}), 200

# ============================================================================
# WORKSPACE MANAGEMENT
# ============================================================================

@super_admin_bp.route('/workspaces/<int:workspace_id>/suspend', methods=['PATCH'])
@jwt_required()
@platform_super_admin_required
def suspend_workspace(workspace_id):
    """Suspend or unsuspend a workspace"""
    from app.models import Workspace
    
    workspace = Workspace.query.get_or_404(workspace_id)
    data = request.get_json()
    suspend = data.get('suspend', True)
    
    workspace.status = 'suspended' if suspend else 'active'
    db.session.commit()
    
    # Audit Log
    try:
        current_user_id = get_jwt_identity()
        log = AuditLog(
            user_id=current_user_id,
            action='suspend_workspace' if suspend else 'activate_workspace',
            resource_type='workspace',
            resource_id=workspace_id,
            details_data=json.dumps({'name': workspace.name, 'suspend': suspend}),
            status='success'
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Audit log failed: {e}")
    
    action = 'suspended' if suspend else 'activated'
    return jsonify({
        'message': f'Workspace {action} successfully',
        'workspace': {
            'id': workspace.id,
            'name': workspace.name,
            'is_active': workspace.is_active
        }
    }), 200

@super_admin_bp.route('/workspaces/<int:workspace_id>', methods=['DELETE'])
@jwt_required()
@platform_super_admin_required
def delete_workspace(workspace_id):
    """Permanently delete a workspace"""
    from app.models import Workspace, WorkspaceMembership, Invite, WorkspaceDomain, StudentProfile, Announcement, User
    
    workspace = Workspace.query.get_or_404(workspace_id)
    
    # Audit Log
    try:
        current_user_id = get_jwt_identity()
        log = AuditLog(
            user_id=current_user_id,
            action='delete_workspace',
            resource_type='workspace',
            resource_id=workspace_id,
            details_data=json.dumps({'name': workspace.name, 'slug': workspace.slug}),
            status='success'
        )
        db.session.add(log)
    except Exception as e:
        print(f"Audit log setup failed: {e}")
    
    # Cascade Delete Dependencies Manually to avoid FK errors
    try:
        from app.models import (
            Class, Channel, Assignment, File, Notification, 
            AuditLog, Presence, WorkspaceMembership, Invite, 
            WorkspaceDomain, StudentProfile, Announcement, User,
            Lesson, GPARecord, DeviceSession, Message
        )
        from app.models.notifications import Notification as NotificationV2, NotificationPreference
        from app.models.academic import Submission
        from app.models.document import Document
        from app.models.chat_features import (
            MessageReaction, MessageReadReceipt, MessageDelivery,
            PinnedMessage, MessageForward, MessageEditHistory,
            ChannelPoll, PollVote, ChannelTopic, ScheduledMessage, ChannelMute
        )
        
        # Helper: Get all user IDs for this workspace
        workspace_user_ids = [u.id for u in User.query.filter_by(workspace_id=workspace_id).all()]
        
        # 1. Clean up Workspace-specific records
        WorkspaceMembership.query.filter_by(workspace_id=workspace_id).delete()
        Invite.query.filter_by(workspace_id=workspace_id).delete()
        WorkspaceDomain.query.filter_by(workspace_id=workspace_id).delete()
        StudentProfile.query.filter_by(workspace_id=workspace_id).delete()
        Announcement.query.filter_by(workspace_id=workspace_id).delete()
        
        # 2. Clean up academic and collaborative data tied to workspace
        # Some models don't have workspace_id directly
        if workspace_user_ids:
            Presence.query.filter(Presence.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            GPARecord.query.filter(GPARecord.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            DeviceSession.query.filter(DeviceSession.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            NotificationPreference.query.filter(NotificationPreference.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            NotificationV2.query.filter(NotificationV2.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            Notification.query.filter(Notification.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            Submission.query.filter(Submission.student_id.in_(workspace_user_ids)).delete(synchronize_session=False)
        
        # Models with direct workspace_id
        Class.query.filter_by(workspace_id=workspace_id).delete()
        Channel.query.filter_by(workspace_id=workspace_id).delete()
        Assignment.query.filter_by(workspace_id=workspace_id).delete()
        File.query.filter_by(workspace_id=workspace_id).delete()
        Document.query.filter_by(workspace_id=workspace_id).delete()
        
        # Models related via Class
        # Lesson filter by Class subquery
        Lesson.query.filter(Lesson.class_id.in_(
            db.session.query(Class.id).filter_by(workspace_id=workspace_id)
        )).delete(synchronize_session=False)
        
        # 3. Clean up generic models that have workspace_id
        AuditLog.query.filter_by(workspace_id=workspace_id).delete()
        
        # 4. Clean up chat features (expensive but necessary)
        if workspace_user_ids:
            # Delete reactions, receipts, delivery for these users
            MessageReaction.query.filter(MessageReaction.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            MessageReadReceipt.query.filter(MessageReadReceipt.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            MessageDelivery.query.filter(MessageDelivery.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            PollVote.query.filter(PollVote.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            ChannelMute.query.filter(ChannelMute.user_id.in_(workspace_user_ids)).delete(synchronize_session=False)
            
        # 5. Finally, we handle the users themselves
        # Delete users associated with the workspace (but don't delete super_admins)
        users = User.query.filter_by(workspace_id=workspace_id).all()
        for user in users:
            # Don't delete platform super admins, just unlink them
            if user.role == 'super_admin':
                 user.workspace_id = None
            else:
                 # Perform a full delete of each user to trigger any existing cascades/manual fixes
                 db.session.delete(user)
             
        db.session.delete(workspace)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback_print = traceback.format_exc()
        print(f"Workspace deletion failed: {traceback_print}")
        return jsonify({'error': f'Failed to delete workspace: {str(e)}'}), 500
    
    return jsonify({'name': workspace.name, 'message': 'Workspace deleted permanently'}), 200
# ============================================================================

@super_admin_bp.route('/admins/<int:admin_id>/suspend', methods=['PATCH'])
@jwt_required()
@platform_super_admin_required
def suspend_admin(admin_id):
    """Suspend or unsuspend an admin"""
    current_user_id = get_jwt_identity()
    
    # Prevent self-suspension
    if admin_id == current_user_id:
        return jsonify({'error': 'Cannot suspend your own account'}), 400
    
    admin = User.query.get_or_404(admin_id)
    
    # Verify user is an admin
    if admin.role not in ['admin', 'super_admin']:
        return jsonify({'error': 'User is not an admin'}), 400
    
    # Prevent suspending super admins
    if admin.role == 'super_admin':
        return jsonify({'error': 'Cannot suspend super admin accounts'}), 403
    
    data = request.get_json()
    suspend = data.get('suspend', True)
    
    admin.is_active = not suspend
    db.session.commit()
    
    action = 'suspended' if suspend else 'activated'
    return jsonify({
        'message': f'Admin {action} successfully',
        'admin': {
            'id': admin.id,
            'username': admin.username,
            'is_active': admin.is_active
        }
    }), 200

# ============================================================================
# USER ASSIGNMENT
# ============================================================================

@super_admin_bp.route('/admins/<int:admin_id>', methods=['DELETE'])
@jwt_required()
@platform_super_admin_required
def delete_admin(admin_id):
    """Permanently delete an admin"""
    current_user_id = get_jwt_identity()
    
    # Prevent self-deletion
    if admin_id == current_user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    admin = User.query.get_or_404(admin_id)
    
    # Verify user is an admin
    if admin.role not in ['admin', 'super_admin']:
        return jsonify({'error': 'User is not an admin'}), 400
    
    # Prevent deleting super admins
    if admin.role == 'super_admin':
        return jsonify({'error': 'Cannot delete super admin accounts'}), 403
    
    try:
        # Audit Log
        try:
            from app.models.security import AuditLog
            log = AuditLog(
                user_id=current_user_id,
                action='delete_admin',
                resource_type='user',
                resource_id=admin_id,
                details_data=json.dumps({'username': admin.username, 'email': admin.email}),
                status='success'
            )
            db.session.add(log)
        except Exception as e:
            print(f"Audit log setup failed: {e}")

        db.session.delete(admin)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete admin: {str(e)}'}), 500
    
    return jsonify({'message': 'Admin deleted permanently'}), 200

# ============================================================================
# USER ASSIGNMENT
# ============================================================================

@super_admin_bp.route('/users', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def list_users():
    """List all users with optional filters"""
    role = request.args.get('role')  # teacher, student
    workspace_id = request.args.get('workspace_id')  # null for unassigned
    search = request.args.get('search', '')
    
    query = User.query
    
    # Filter by role
    if role:
        query = query.filter(User.role == role)
    
    # Filter by workspace
    if workspace_id == 'null':
        query = query.filter(User.workspace_id == None)
    elif workspace_id:
        query = query.filter(User.workspace_id == int(workspace_id))
    
    # Search by name or email
    if search:
        query = query.filter(
            db.or_(
                User.username.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%')
            )
        )
    
    users = query.order_by(User.created_at.desc()).limit(500).all()
    
    user_list = []
    for u in users:
        try:
            user_list.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'full_name': f"{u.first_name or ''} {u.last_name or ''}".strip() or u.username,
                'role': u.role,
                'workspace_id': u.workspace.id if u.workspace else None, # Use ID from object if linked
                'workspace_name': u.workspace.name if u.workspace else None,
                'is_active': u.is_active
            })
        except Exception:
            # Skip malformed users
            continue

    return jsonify(user_list), 200

@super_admin_bp.route('/users/assign-workspace', methods=['POST'])
@jwt_required()
@platform_super_admin_required
def assign_users_to_workspace():
    """Bulk assign users to a workspace"""
    data = request.get_json()
    user_ids = data.get('user_ids', [])
    workspace_id = data.get('workspace_id')
    
    if not user_ids or not workspace_id:
        return jsonify({'error': 'user_ids and workspace_id are required'}), 400
    
    # Verify workspace exists
    from app.models import Workspace
    workspace = Workspace.query.get_or_404(workspace_id)
    
    # Update users
    users = User.query.filter(User.id.in_(user_ids)).all()
    
    if not users:
        return jsonify({'error': 'No valid users found'}), 404
    
    updated_count = 0
    for user in users:
        # Only assign teachers and students
        if user.role in ['teacher', 'student']:
            user.workspace_id = workspace_id
            updated_count += 1
    
    db.session.commit()
    
    # Audit Log
    try:
        from app.models.security import AuditLog
        current_user_id = get_jwt_identity()
        log = AuditLog(
            user_id=current_user_id,
            action='bulk_assign_users',
            resource_type='workspace',
            resource_id=workspace_id,
            details_data=json.dumps({
                'user_count': updated_count,
                'target_workspace': workspace.name
            }),
            status='success'
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Audit log failed: {e}")
    
    return jsonify({
        'message': f'{updated_count} user(s) assigned to workspace',
        'workspace': workspace.name,
        'updated_count': updated_count
    }), 200
