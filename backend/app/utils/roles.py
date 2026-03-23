def is_super_admin(user):
    """Check if user is a platform-level super admin"""
    return user and user.platform_role == 'SUPER_ADMIN'

def is_at_least_admin(user):
    """Check if user is admin or super admin within their primary workspace"""
    return user and (user.role in ['admin', 'super_admin'] or user.platform_role == 'SUPER_ADMIN')

def is_at_least_teacher(user):
    """Check if user is teacher, admin or super admin within their primary workspace"""
    return user and (user.role in ['teacher', 'admin', 'super_admin'] or user.platform_role == 'SUPER_ADMIN')

def is_workspace_member(user, workspace_id):
    """Check if user is a member of a specific workspace"""
    if not user:
        return False
    # Super admins can access any workspace
    if user.platform_role == 'SUPER_ADMIN':
        return True
    
    # Check primary workspace
    if user.workspace_id == workspace_id:
        return True
    
    # Check many-to-many memberships
    from app.models import WorkspaceMembership
    membership = WorkspaceMembership.query.filter_by(
        user_id=user.id, 
        workspace_id=workspace_id,
        status='active'
    ).first()
    
    return membership is not None
