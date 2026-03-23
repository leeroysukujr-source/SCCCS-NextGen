from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Group, GroupMember, GroupJoinRequest, User, GroupMessage
import secrets
import string
from datetime import datetime

groups_bp = Blueprint('groups', __name__)
from flask_cors import CORS
CORS(groups_bp)

def generate_join_code():
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

@groups_bp.route('', methods=['POST'])
@jwt_required()
def create_group():
    """Create a new group - Admin only"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    join_type = data.get('join_type', 'request')  # 'direct', 'request', 'link'
    
    # Generate join_code if join_type is 'link'
    join_code = None
    if join_type == 'link':
        join_code = generate_join_code()
        while Group.query.filter_by(join_code=join_code).first():
            join_code = generate_join_code()
    
    group = Group(
        name=data.get('name', ''),
        description=data.get('description', ''),
        category=data.get('category', 'students'),  # students, teachers, etc.
        created_by=current_user_id,
        join_type=join_type,
        join_code=join_code,
        max_members=data.get('max_members'),
        is_active=data.get('is_active', True)
    )
    
    db.session.add(group)
    db.session.commit()
    
    # Add creator as admin member
    member = GroupMember(group_id=group.id, user_id=current_user_id, role='admin')
    db.session.add(member)
    db.session.commit()
    
    return jsonify(group.to_dict()), 201

@groups_bp.route('', methods=['GET'])
@jwt_required()
def get_groups():
    """Get all groups - visible to all users"""
    current_user_id = get_jwt_identity()
    
    # Get all active groups
    groups = Group.query.filter_by(is_active=True).order_by(Group.created_at.desc()).all()
    
    # Check if user is a member of each group
    groups_with_membership = []
    for group in groups:
        member = GroupMember.query.filter_by(group_id=group.id, user_id=current_user_id).first()
        is_member = member is not None

        # Privacy Filter: Hide 'direct' groups if not a member (unless created by user)
        if group.join_type == 'direct' and not is_member and group.created_by != current_user_id:
            continue

        group_dict = group.to_dict()
        group_dict['is_member'] = is_member
        group_dict['member_role'] = member.role if member else None
        
        # Check if user has pending join request
        if not member:
            pending_request = GroupJoinRequest.query.filter_by(
                group_id=group.id, 
                user_id=current_user_id, 
                status='pending'
            ).first()
            group_dict['has_pending_request'] = pending_request is not None
        else:
            group_dict['has_pending_request'] = False
        
        groups_with_membership.append(group_dict)
    
    return jsonify(groups_with_membership), 200

@groups_bp.route('/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group(group_id):
    """Get a specific group"""
    group = Group.query.get(group_id)
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    group_dict = group.to_dict()
    current_user_id = get_jwt_identity()
    
    # Check membership
    member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id).first()
    group_dict['is_member'] = member is not None
    group_dict['member_role'] = member.role if member else None
    
    # Check pending request
    if not member:
        pending_request = GroupJoinRequest.query.filter_by(
            group_id=group_id, 
            user_id=current_user_id, 
            status='pending'
        ).first()
        group_dict['has_pending_request'] = pending_request is not None
    else:
        group_dict['has_pending_request'] = False
    
    return jsonify(group_dict), 200

@groups_bp.route('/<int:group_id>', methods=['PUT'])
@jwt_required()
def update_group(group_id):
    """Update a group - Admin or group admin only"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    group = Group.query.get(group_id)
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Check permissions
    if user.role != 'admin':
        member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id, role='admin').first()
        if not member:
            return jsonify({'error': 'Permission denied'}), 403
    
    data = request.get_json()
    
    # Update fields
    if 'name' in data:
        group.name = data['name']
    if 'description' in data:
        group.description = data['description']
    if 'category' in data:
        group.category = data['category']
    if 'join_type' in data:
        join_type = data['join_type']
        group.join_type = join_type
        
        # Generate join_code if join_type is 'link' and doesn't have one
        if join_type == 'link' and not group.join_code:
            join_code = generate_join_code()
            while Group.query.filter_by(join_code=join_code).first():
                join_code = generate_join_code()
            group.join_code = join_code
        elif join_type != 'link':
            group.join_code = None
    
    if 'max_members' in data:
        group.max_members = data['max_members']
    if 'is_active' in data:
        group.is_active = data['is_active']
    
    group.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(group.to_dict()), 200

@groups_bp.route('/<int:group_id>', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    """Delete a group - Creator can delete, or admin can delete groups created by admins"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    group = Group.query.get(group_id)
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Check if current user is admin
    is_admin = current_user and current_user.role == 'admin'
    is_creator = group.created_by == current_user_id
    
    # Get the creator user to check if they are currently an admin
    creator_user = User.query.get(group.created_by)
    creator_is_admin = creator_user and creator_user.role == 'admin'
    
    # Allow deletion if:
    # 1. User is the creator, OR
    # 2. User is admin AND the group was created by an admin (currently)
    if not is_creator and not (is_admin and creator_is_admin):
        return jsonify({'error': 'Only the group creator can delete this group, or admins can delete groups created by admins'}), 403
    
    # Delete all members and requests first (cascade should handle this, but explicit is safer)
    GroupMember.query.filter_by(group_id=group_id).delete()
    GroupJoinRequest.query.filter_by(group_id=group_id).delete()
    
    db.session.delete(group)
    db.session.commit()
    
    return jsonify({'message': 'Group deleted successfully'}), 200

@groups_bp.route('/<int:group_id>/join', methods=['POST'])
@jwt_required()
def join_group(group_id):
    """Join a group based on join_type"""
    current_user_id = get_jwt_identity()
    group = Group.query.get(group_id)
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    if not group.is_active:
        return jsonify({'error': 'Group is not active'}), 400
    
    # Check if already a member
    existing_member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id).first()
    if existing_member:
        return jsonify({'error': 'Already a member of this group'}), 400
    
    # Check max members
    if group.max_members:
        current_members = GroupMember.query.filter_by(group_id=group_id).count()
        if current_members >= group.max_members:
            return jsonify({'error': 'Group is full'}), 400
    
    # Handle different join types
    if group.join_type == 'direct':
        # Direct join - add member immediately
        member = GroupMember(group_id=group_id, user_id=current_user_id, role='member')
        db.session.add(member)
        db.session.commit()
        return jsonify({'message': 'Joined group successfully', 'group': group.to_dict()}), 200
    
    elif group.join_type == 'request':
        # Request join - create join request
        existing_request = GroupJoinRequest.query.filter_by(
            group_id=group_id, 
            user_id=current_user_id, 
            status='pending'
        ).first()
        
        if existing_request:
            return jsonify({'error': 'Join request already pending'}), 400
        
        data = request.get_json() or {}
        join_request = GroupJoinRequest(
            group_id=group_id,
            user_id=current_user_id,
            message=data.get('message', ''),
            status='pending'
        )
        db.session.add(join_request)
        db.session.commit()
        return jsonify({'message': 'Join request submitted', 'request': join_request.to_dict()}), 201
    
    elif group.join_type == 'link':
        # Link join - verify join_code if provided
        data = request.get_json() or {}
        join_code = data.get('join_code')
        
        if not join_code or join_code != group.join_code:
            return jsonify({'error': 'Invalid join code'}), 400
        
        member = GroupMember(group_id=group_id, user_id=current_user_id, role='member')
        db.session.add(member)
        db.session.commit()
        return jsonify({'message': 'Joined group successfully', 'group': group.to_dict()}), 200
    
    return jsonify({'error': 'Invalid join type'}), 400

@groups_bp.route('/join/<join_code>', methods=['POST'])
@jwt_required()
def join_group_by_code(join_code):
    """Join a group using join code (for link-based joining)"""
    current_user_id = get_jwt_identity()
    group = Group.query.filter_by(join_code=join_code, is_active=True).first()
    
    if not group:
        return jsonify({'error': 'Invalid join link'}), 404
    
    if group.join_type != 'link':
        return jsonify({'error': 'This group does not accept link-based joining'}), 400
    
    # Check if already a member
    existing_member = GroupMember.query.filter_by(group_id=group.id, user_id=current_user_id).first()
    if existing_member:
        return jsonify({'error': 'Already a member of this group'}), 400
    
    # Check max members
    if group.max_members:
        current_members = GroupMember.query.filter_by(group_id=group.id).count()
        if current_members >= group.max_members:
            return jsonify({'error': 'Group is full'}), 400
    
    member = GroupMember(group_id=group.id, user_id=current_user_id, role='member')
    db.session.add(member)
    db.session.commit()
    
    return jsonify({'message': 'Joined group successfully', 'group': group.to_dict()}), 200

@groups_bp.route('/<int:group_id>/leave', methods=['POST'])
@jwt_required()
def leave_group(group_id):
    """Leave a group"""
    current_user_id = get_jwt_identity()
    
    member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id).first()
    
    if not member:
        return jsonify({'error': 'Not a member of this group'}), 404
    
    # Cannot leave if you're the creator/admin (optional restriction)
    group = Group.query.get(group_id)
    if group.created_by == current_user_id:
        return jsonify({'error': 'Group creator cannot leave the group'}), 400
    
    db.session.delete(member)
    db.session.commit()
    
    return jsonify({'message': 'Left group successfully'}), 200

@groups_bp.route('/<int:group_id>/members', methods=['GET'])
@jwt_required()
def get_group_members(group_id):
    """Get all members of a group"""
    # Check if group exists
    group = Group.query.get(group_id)
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    current_user_id = get_jwt_identity()
    
    # Check if user is a member
    member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id).first()
    if not member:
        # Non-members can see member count but not member list
        return jsonify({'member_count': group.members.count()}), 200
    
    members = GroupMember.query.filter_by(group_id=group_id).all()
    users = [User.query.get(m.user_id) for m in members]
    
    members_list = []
    for m, u in zip(members, users):
        if u:
            member_dict = u.to_dict()
            member_dict['member_role'] = m.role  # member role in the group
            member_dict['joined_at'] = m.joined_at.isoformat() if m.joined_at else None
            members_list.append(member_dict)
    
    return jsonify(members_list), 200

@groups_bp.route('/<int:group_id>/members/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_group_member_role(group_id, user_id):
    """Update group member role - Only group admin/co-admin can do this"""
    current_user_id = get_jwt_identity()
    group = Group.query.get(group_id)
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Check if current user is group admin or co-admin
    current_member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id).first()
    if not current_member or current_member.role not in ['admin', 'co-admin']:
        # Creator is always admin, check that too
        if group.created_by != current_user_id:
            return jsonify({'error': 'Only group admins can update member roles'}), 403
    
    # Check if target user is a member
    target_member = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not target_member:
        return jsonify({'error': 'User is not a member of this group'}), 404
    
    # Cannot change creator's role
    if group.created_by == user_id:
        return jsonify({'error': 'Cannot change the creator\'s role'}), 400
    
    data = request.get_json()
    new_role = data.get('role', 'member')
    
    if new_role not in ['admin', 'co-admin', 'member']:
        return jsonify({'error': 'Invalid role. Must be admin, co-admin, or member'}), 400
    
    target_member.role = new_role
    db.session.commit()
    
    return jsonify({'message': 'Member role updated successfully'}), 200

@groups_bp.route('/<int:group_id>/requests', methods=['GET'])
@jwt_required()
def get_join_requests(group_id):
    """Get pending join requests for a group - Admin or group admin only"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    group = Group.query.get(group_id)
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Check permissions
    if user.role != 'admin':
        member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id, role='admin').first()
        if not member:
            return jsonify({'error': 'Permission denied'}), 403
    
    # Get pending requests
    requests = GroupJoinRequest.query.filter_by(group_id=group_id, status='pending').order_by(GroupJoinRequest.created_at.desc()).all()
    
    return jsonify([req.to_dict() for req in requests]), 200

@groups_bp.route('/<int:group_id>/requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
def approve_join_request(group_id, request_id):
    """Approve a join request - Admin or group admin only"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    group = Group.query.get(group_id)
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Check permissions
    if user.role != 'admin':
        member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id, role='admin').first()
        if not member:
            return jsonify({'error': 'Permission denied'}), 403
    
    join_request = GroupJoinRequest.query.get(request_id)
    
    if not join_request or join_request.group_id != group_id:
        return jsonify({'error': 'Join request not found'}), 404
    
    if join_request.status != 'pending':
        return jsonify({'error': 'Request already processed'}), 400
    
    # Check max members
    if group.max_members:
        current_members = GroupMember.query.filter_by(group_id=group_id).count()
        if current_members >= group.max_members:
            return jsonify({'error': 'Group is full'}), 400
    
    # Add user as member
    member = GroupMember(group_id=group_id, user_id=join_request.user_id, role='member')
    db.session.add(member)
    
    # Update request status
    join_request.status = 'approved'
    join_request.reviewed_by = current_user_id
    join_request.reviewed_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'message': 'Join request approved', 'member': member.id}), 200

@groups_bp.route('/<int:group_id>/requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
def reject_join_request(group_id, request_id):
    """Reject a join request - Admin or group admin only"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    group = Group.query.get(group_id)
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Check permissions
    if user.role != 'admin':
        member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id, role='admin').first()
        if not member:
            return jsonify({'error': 'Permission denied'}), 403
    
    join_request = GroupJoinRequest.query.get(request_id)
    
    if not join_request or join_request.group_id != group_id:
        return jsonify({'error': 'Join request not found'}), 404
    
    if join_request.status != 'pending':
        return jsonify({'error': 'Request already processed'}), 400
    
    # Update request status
    join_request.status = 'rejected'
    join_request.reviewed_by = current_user_id
    join_request.reviewed_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'message': 'Join request rejected'}), 200



@groups_bp.route('/<int:group_id>/messages', methods=['GET'])

@jwt_required()
def get_group_messages(group_id):
    """Get messages for a group"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if user is a member
        member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id).first()
        if not member:
             return jsonify({'error': 'Not a member of this group'}), 403
                
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        messages = GroupMessage.query.filter_by(group_id=group_id)\
            .order_by(GroupMessage.created_at.asc())\
            .paginate(page=page, per_page=per_page, error_out=False)
            
        return jsonify([msg.to_dict() for msg in messages.items]), 200
    except Exception as e:
        import traceback
        print(f"Error fetching group messages: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@groups_bp.route('/<int:group_id>/messages', methods=['POST'])

@jwt_required()
def create_group_message(group_id):
    """Post a message to a group"""
    current_user_id = get_jwt_identity()
    
    # Check if user is a member
    member = GroupMember.query.filter_by(group_id=group_id, user_id=current_user_id).first()
    if not member:
         return jsonify({'error': 'Not a member of this group'}), 403
         
    data = request.get_json()
    content = data.get('content')
    if not content:
        return jsonify({'error': 'Content is required'}), 400
        
    message = GroupMessage(
        group_id=group_id,
        user_id=current_user_id,
        content=content,
        message_type=data.get('message_type', 'text'),
        file_id=data.get('file_id')
    )
    
    db.session.add(message)
    db.session.commit()
    
    return jsonify(message.to_dict()), 201


