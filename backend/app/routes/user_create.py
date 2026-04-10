"""
Standalone user creation endpoint.
Deliberately isolated from all other route files to prevent any circular import issues.
"""
import secrets
import string
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db

user_create_bp = Blueprint('user_create', __name__)


def _is_admin(user):
    return user and user.role in ['admin', 'super_admin']


@user_create_bp.route('/batch-create', methods=['POST'])
@user_create_bp.route('/bulk', methods=['POST'])
@jwt_required()
def create_users():
    """
    Create one or more users. Accepts:
    { "users": [{ "email", "role", "first_name", "last_name", "password", "username", "reg_no" }] }
    """
    # Lazy imports — nothing from other route files
    from app.models import User, WorkspaceMembership, StudentProfile

    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not _is_admin(current_user):
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403

    data = request.get_json() or {}
    workspace_id = current_user.workspace_id

    # Super admin can target a specific workspace
    if current_user.role == 'super_admin' and data.get('workspace_id'):
        workspace_id = data['workspace_id']

    if not workspace_id:
        return jsonify({'error': 'No workspace context found'}), 400

    users_data = data.get('users', [])
    if not users_data or not isinstance(users_data, list):
        return jsonify({'error': 'Invalid payload. "users" list is required.'}), 400

    created_users = []
    errors = []

    for item in users_data:
        email      = (item.get('email') or '').strip()
        role       = (item.get('role') or 'student').strip()
        first_name = (item.get('first_name') or '').strip()
        last_name  = (item.get('last_name') or '').strip()
        reg_no     = (item.get('reg_no') or '').strip()
        username   = (item.get('username') or '').strip()
        password   = item.get('password') or secrets.token_urlsafe(8)

        # Only allow safe roles
        if role not in ['student', 'teacher', 'staff', 'admin']:
            role = 'student'

        # Build username
        if role == 'student':
            if not reg_no:
                reg_no = 'REG-' + ''.join(secrets.choice(string.digits) for _ in range(6))
            if not username:
                username = reg_no
        else:
            if not username and email:
                username = email.split('@')[0]
            if not username:
                username = 'user' + ''.join(secrets.choice(string.digits) for _ in range(6))

        # Ensure unique username
        base = username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base}{counter}"
            counter += 1

        # Handle email
        if email:
            if User.query.filter_by(email=email).first():
                errors.append(f"Email already exists: {email}")
                continue
            final_email = email
        else:
            final_email = f"{username}@placeholder.invalid"

        try:
            new_user = User(
                username=username,
                email=final_email,
                first_name=first_name,
                last_name=last_name,
                role=role,
                workspace_id=workspace_id,
                status='active'
            )
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.flush()  # get new_user.id

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
                'email': email,
                'role': new_user.role,
                'reg_no': reg_no if role == 'student' else None,
                'password': password
            })

        except Exception as e:
            db.session.rollback()
            errors.append(f"Failed to create {email or username}: {str(e)}")
            continue

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database commit failed: {str(e)}'}), 500

    return jsonify({
        'message': f'Successfully created {len(created_users)} user(s).',
        'created': created_users,
        'errors': errors
    }), 201
