from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Class, ClassMember, Group, GroupMember
from app.utils.roles import is_at_least_admin
from app.utils.scoping import scope_query, get_current_workspace_id
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import secrets

admin_bp = Blueprint('admin', __name__)

def is_admin(user):
    """Check if user is admin or super admin"""
    return is_at_least_admin(user)

@admin_bp.route('/broadcast-email', methods=['POST'])
@jwt_required()
def broadcast_email():
    """Send broadcast email to selected groups (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    data = request.get_json()
    
    subject = data.get('subject', '')
    message = data.get('message', '')
    recipients = data.get('recipients', [])  # ['students', 'teachers', 'cps']
    
    if not subject or not message:
        return jsonify({'error': 'Subject and message are required'}), 400
    
    if not recipients:
        return jsonify({'error': 'At least one recipient group is required'}), 400
    
    # Get recipients based on groups - SCOPED to current admin's workspace
    user_emails = []
    if 'students' in recipients:
        students = scope_query(User.query.filter_by(role='student', is_active=True), User).all()
        user_emails.extend([s.email for s in students if s.email])
    
    if 'teachers' in recipients:
        teachers = scope_query(User.query.filter_by(role='teacher', is_active=True), User).all()
        user_emails.extend([t.email for t in teachers if t.email])
    
    # For CPS group, you might want to filter by a specific criteria
    # For now, treating it as a separate filter - you can customize this
    if 'cps' in recipients:
        # Example: CPS might be users with a specific attribute or all active users
        # Adjust based on your CPS definition
        cps_users = scope_query(User.query.filter_by(is_active=True), User).all()
        user_emails.extend([u.email for u in cps_users if u.email and u.email not in user_emails])
    
    # Remove duplicates
    user_emails = list(set(user_emails))
    
    if not user_emails:
        return jsonify({'error': 'No recipients found for selected groups'}), 400
    
    # Email configuration from environment variables
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_username = os.getenv('SMTP_USERNAME', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    from_email = os.getenv('SMTP_FROM_EMAIL', smtp_username)
    
    if not smtp_username or not smtp_password:
        return jsonify({'error': 'Email server not configured. Please configure SMTP settings.'}), 500
    
    # Send emails
    sent_count = 0
    failed_count = 0
    errors = []
    
    try:
        # Create SMTP connection
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        
        for email in user_emails:
            try:
                # Create message
                msg = MIMEMultipart()
                msg['From'] = from_email
                msg['To'] = email
                msg['Subject'] = subject
                
                # Add body
                body = f"""
{message}

---
This is an automated message from SCCCS NextGen Platform.
Please do not reply to this email.
"""
                msg.attach(MIMEText(body, 'plain'))
                
                # Send email
                server.send_message(msg)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                errors.append(f"Failed to send to {email}: {str(e)}")
        
        server.quit()
        
        return jsonify({
            'message': 'Broadcast email sent successfully',
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total_recipients': len(user_emails),
            'errors': errors if errors else None
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to send broadcast email: {str(e)}',
            'sent_count': sent_count,
            'failed_count': failed_count
        }), 500

@admin_bp.route('/email-config', methods=['GET'])
@jwt_required()
def get_email_config():
    """Get email configuration status (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    smtp_server = os.getenv('SMTP_SERVER', '')
    smtp_username = os.getenv('SMTP_USERNAME', '')
    
    is_configured = bool(smtp_server and smtp_username)
    
    return jsonify({
        'configured': is_configured,
        'smtp_server': smtp_server if is_configured else None
    }), 200

# Lecturer Management Routes

@admin_bp.route('/lecturers', methods=['GET'])
@jwt_required()
def get_lecturers():
    """Get all lecturers (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    if current_user.role == 'super_admin':
        workspace_id = request.args.get('workspace_id')
        if workspace_id:
             lecturers = User.query.filter_by(role='teacher', workspace_id=workspace_id).all()
        else:
             lecturers = User.query.filter_by(role='teacher').all()
    else:
        # Filter by admin's workspace - using utility
        lecturers = scope_query(User.query.filter_by(role='teacher'), User).all()
    return jsonify([lecturer.to_dict() for lecturer in lecturers]), 200

@admin_bp.route('/lecturers', methods=['POST'])
@jwt_required()
def create_lecturer():
    """Create a new lecturer (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    data = request.get_json()
    
    if not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({'error': 'User with this email already exists'}), 400
    
    # Generate username from email if not provided
    username = data.get('username') or data['email'].split('@')[0]
    
    # Ensure username is unique
    base_username = username
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{base_username}{counter}"
        counter += 1
    
    lecturer = User(
        username=username,
        email=data['email'],
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        role='teacher',
        workspace_id=current_user.workspace_id or get_current_workspace_id(), # Enforce admin's workspace
        admin_id=current_user.id
    )
    
    # Set password if provided, otherwise generate a temporary one
    password = data.get('password') or secrets.token_urlsafe(12)
    lecturer.set_password(password)
    
    db.session.add(lecturer)
    db.session.commit()
    
    return jsonify({
        'message': 'Lecturer created successfully',
        'lecturer': lecturer.to_dict(),
        'temporary_password': password if not data.get('password') else None
    }), 201

@admin_bp.route('/lecturers/<int:lecturer_id>', methods=['PUT'])
@jwt_required()
def update_lecturer(lecturer_id):
    """Update lecturer information (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    lecturer = User.query.get(lecturer_id)
    
    if not lecturer:
        return jsonify({'error': 'Lecturer not found'}), 404
    
    if lecturer.role != 'teacher':
        return jsonify({'error': 'User is not a lecturer'}), 400
    
    data = request.get_json()
    
    if 'first_name' in data:
        lecturer.first_name = data['first_name']
    if 'last_name' in data:
        lecturer.last_name = data['last_name']
    if 'email' in data:
        # Check if email is already taken
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != lecturer_id:
            return jsonify({'error': 'Email already in use'}), 400
        lecturer.email = data['email']
    if 'username' in data:
        # Check if username is already taken
        existing = User.query.filter_by(username=data['username']).first()
        if existing and existing.id != lecturer_id:
            return jsonify({'error': 'Username already in use'}), 400
        lecturer.username = data['username']
    if 'password' in data:
        lecturer.set_password(data['password'])
    if 'is_active' in data:
        lecturer.is_active = data['is_active']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Lecturer updated successfully',
        'lecturer': lecturer.to_dict()
    }), 200

@admin_bp.route('/lecturers/<int:lecturer_id>', methods=['DELETE'])
@jwt_required()
def delete_lecturer(lecturer_id):
    """Delete or deactivate a lecturer (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    lecturer = User.query.get(lecturer_id)
    
    if not lecturer:
        return jsonify({'error': 'Lecturer not found'}), 404
    
    if lecturer.role != 'teacher':
        return jsonify({'error': 'User is not a lecturer'}), 400
    
    if lecturer.id == current_user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    
    # Instead of deleting, deactivate the lecturer
    lecturer.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'Lecturer deactivated successfully'}), 200

@admin_bp.route('/lecturers/<int:lecturer_id>/assign-class/<int:class_id>', methods=['POST'])
@jwt_required()
def assign_lecturer_to_class(lecturer_id, class_id):
    """Assign lecturer to a class (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    # Ensure admin can only assign lecturers/classes in their own workspace
    lecturer = scope_query(User.query, User).filter_by(id=lecturer_id).first()
    class_obj = scope_query(Class.query, Class).filter_by(id=class_id).first()
    
    if not lecturer:
        return jsonify({'error': 'Lecturer not found'}), 404
    
    if not class_obj:
        return jsonify({'error': 'Class not found'}), 404
    
    if lecturer.role != 'teacher':
        return jsonify({'error': 'User is not a lecturer'}), 400
    
    # Check if already a member
    existing = ClassMember.query.filter_by(class_id=class_id, user_id=lecturer_id).first()
    if existing:
        # Update role to teacher if not already
        if existing.role != 'teacher':
            existing.role = 'teacher'
            db.session.commit()
        return jsonify({'message': 'Lecturer already assigned to class'}), 200
    
    # Add lecturer as member with teacher role
    member = ClassMember(class_id=class_id, user_id=lecturer_id, role='teacher')
    db.session.add(member)
    db.session.commit()
    
    return jsonify({
        'message': 'Lecturer assigned to class successfully',
        'class': class_obj.to_dict(),
        'lecturer': lecturer.to_dict()
    }), 200

@admin_bp.route('/lecturers/<int:lecturer_id>/assign-group/<int:group_id>', methods=['POST'])
@jwt_required()
def assign_lecturer_to_group(lecturer_id, group_id):
    """Assign lecturer to a group (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    # Ensure admin can only assign lecturers/groups in their own workspace
    lecturer = scope_query(User.query, User).filter_by(id=lecturer_id).first()
    group = scope_query(Group.query, Group).filter_by(id=group_id).first()
    
    if not lecturer:
        return jsonify({'error': 'Lecturer not found'}), 404
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    if lecturer.role != 'teacher':
        return jsonify({'error': 'User is not a lecturer'}), 400
    
    # Check if already a member
    existing = GroupMember.query.filter_by(group_id=group_id, user_id=lecturer_id).first()
    if existing:
        # Update role to admin if not already
        if existing.role != 'admin':
            existing.role = 'admin'
            db.session.commit()
        return jsonify({'message': 'Lecturer already assigned to group'}), 200
    
    # Add lecturer as member with admin role
    member = GroupMember(group_id=group_id, user_id=lecturer_id, role='admin')
    db.session.add(member)
    db.session.commit()
    
    return jsonify({
        'message': 'Lecturer assigned to group successfully',
        'group': group.to_dict(),
        'lecturer': lecturer.to_dict()
    }), 200

@admin_bp.route('/lecturers/<int:lecturer_id>/classes', methods=['GET'])
@jwt_required()
def get_lecturer_classes(lecturer_id):
    """Get all classes assigned to a lecturer (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    lecturer = User.query.get(lecturer_id)
    
    if not lecturer:
        return jsonify({'error': 'Lecturer not found'}), 404
    
    if lecturer.role != 'teacher':
        return jsonify({'error': 'User is not a lecturer'}), 400
    
    # Get classes where lecturer is a member or creator
    member_classes = db.session.query(Class).join(ClassMember).filter(
        ClassMember.user_id == lecturer_id
    ).all()
    
    created_classes = Class.query.filter_by(teacher_id=lecturer_id).all()
    
    # Combine and remove duplicates
    all_classes = {cls.id: cls for cls in member_classes + created_classes}
    
    return jsonify([cls.to_dict() for cls in all_classes.values()]), 200

@admin_bp.route('/lecturers/<int:lecturer_id>/groups', methods=['GET'])
@jwt_required()
def get_lecturer_groups(lecturer_id):
    """Get all groups assigned to a lecturer (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    # Ensure scoping
    lecturer = scope_query(User.query, User).filter_by(id=lecturer_id).first()
    
    if not lecturer:
        return jsonify({'error': 'Lecturer not found'}), 404
    
    if lecturer.role != 'teacher':
        return jsonify({'error': 'User is not a lecturer'}), 400
    
    # Ensure scoping
    member_groups = scope_query(db.session.query(Group).join(GroupMember), Group).filter(
        GroupMember.user_id == lecturer_id
    ).all()
    
    
    return jsonify([group.to_dict() for group in member_groups]), 200

@admin_bp.route('/users/bulk', methods=['POST'])
@jwt_required()
def bulk_create_users():
    """Bulk create students or staff (workspace admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
        
    data = request.get_json()
    req_workspace_id = data.get('workspace_id')
    
    # If super admin specifies a workspace, use it. Otherwise use current user's workspace
    if is_super_admin(current_user) and req_workspace_id:
        workspace_id = req_workspace_id
    else:
        workspace_id = current_user.workspace_id or get_current_workspace_id()
    
    if not workspace_id:
        return jsonify({'error': 'No workspace context found'}), 400
    users_data = data.get('users', [])
    
    if not users_data or not isinstance(users_data, list):
        return jsonify({'error': 'Invalid payload. "users" list is required.'}), 400
        
    from app.models import StudentProfile, WorkspaceMembership
    import secrets
    import string
    
    created_users = []
    errors = []
    
    for item in users_data:
        email = item.get('email', '').strip()
        role = item.get('role', 'student').strip()
        first_name = item.get('first_name', '').strip()
        last_name = item.get('last_name', '').strip()
        reg_no = item.get('reg_no', '').strip()
        
        # Prevent assigning admin roles in bulk create
        if role not in ['student', 'teacher', 'staff']:
            role = 'student'
            
        if not email and role != 'student':
            errors.append(f"Email required for staff: {first_name} {last_name}")
            continue
            
        # Determine username and reg_no
        username = item.get('username', '').strip()
        
        if role == 'student':
            if not reg_no:
                # Auto-generate reg_no if missing
                random_chars = ''.join(secrets.choice(string.digits) for _ in range(6))
                reg_no = f"REG-{random_chars}"
                
            # If student, reg_no becomes their primary login (set as username)
            if not username:
                username = reg_no
        else:
            if not username and email:
                username = email.split('@')[0]
                
        # Ensure username uniqueness
        base_username = username or f"user{secrets.randbelow(9999)}"
        username = base_username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1
            
        # Ensure email uniqueness if provided
        final_email = email
        if email:
            if User.query.filter_by(email=email).first():
                errors.append(f"Email {email} already exists.")
                continue
        else:
            # Generate a safely fake email since db requires unique email
            final_email = f"{username}-fake@placeholder.invalid"
                
        # Create user
        new_user = User(
            username=username,
            email=final_email,
            first_name=first_name,
            last_name=last_name,
            role=role,
            workspace_id=workspace_id,
            status='active'
        )
        
        password = item.get('password') or secrets.token_urlsafe(8)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush() # get new_user.id
        
        if role == 'student':
            profile = StudentProfile(
                user_id=new_user.id,
                workspace_id=workspace_id,
                reg_no=reg_no,
                verification_status='verified'
            )
            db.session.add(profile)
            
        membership = WorkspaceMembership(
            user_id=new_user.id,
            workspace_id=workspace_id,
            role=role,
            status='active'
        )
        db.session.add(membership)
        
        created_users.append({
            'id': new_user.id,
            'username': new_user.username,
            'reg_no': reg_no if role == 'student' else None,
            'email': email,
            'role': new_user.role,
            'password': password 
        })
        
    try:
        db.session.commit()
        return jsonify({
            'message': f"Successfully created {len(created_users)} users.",
            'created': created_users,
            'errors': errors
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
