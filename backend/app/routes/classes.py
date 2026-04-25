from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Class, ClassMember, User
from app.utils.scoping import scope_query, get_current_workspace_id
import secrets
import string
from app.utils.middleware import feature_required

classes_bp = Blueprint('classes', __name__)

@classes_bp.before_request
@feature_required('classes')
def check_classes_enabled():
    pass

def generate_class_code():
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))

@classes_bp.route('', methods=['POST'])
@jwt_required()
def create_class():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        current_app.logger.error(f"Class creation failed: User ID {current_user_id} not found")
        return jsonify({'error': 'User not found'}), 404
    
    current_app.logger.info(f"Class creation attempt by User: {current_user.username}, Role: {current_user.role}")
    
    if current_user.role not in ['admin', 'teacher', 'super_admin']:
        current_app.logger.warning(f"Class creation denied for {current_user.username} (Role: {current_user.role})")
        return jsonify({'error': 'Only teachers and admins can create classes'}), 403
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Class name is required'}), 400
    
    try:
        class_code = generate_class_code()
        # Ensure unique code
        max_attempts = 10
        attempts = 0
        while Class.query.filter_by(code=class_code).first() and attempts < max_attempts:
            class_code = generate_class_code()
            attempts += 1
        
        if attempts >= max_attempts:
            return jsonify({'error': 'Failed to generate unique class code. Please try again.'}), 500
        
        class_obj = Class(
            name=name,
            description=data.get('description', '').strip() if data.get('description') else '',
            code=class_code,
            teacher_id=current_user_id,
            workspace_id=current_user.workspace_id or get_current_workspace_id()
        )
        
        db.session.add(class_obj)
        db.session.flush()  # Get the ID without committing
        
        # Add teacher as member
        member = ClassMember(class_id=class_obj.id, user_id=current_user_id, role='teacher')
        db.session.add(member)
        db.session.commit()
        
        return jsonify(class_obj.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error creating class: {e}")
        print(f"Traceback: {error_trace}")
        # Return more detailed error in development
        error_message = str(e)
        if 'UNIQUE constraint' in error_message:
            return jsonify({'error': 'A class with this code already exists. Please try again.'}), 400
        elif 'NOT NULL constraint' in error_message:
            return jsonify({'error': 'Missing required field. Please check your input.'}), 400
        else:
            return jsonify({'error': f'Failed to create class: {error_message}'}), 500

@classes_bp.route('', methods=['GET'])
@jwt_required()
def get_classes():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    from sqlalchemy.orm import joinedload
    
    # Admin can see ALL classes in their workspace
    if user.role in ['admin', 'super_admin']:
        all_classes = scope_query(Class.query.options(joinedload(Class.teacher)), Class).order_by(Class.created_at.desc()).all()
        return jsonify([cls.to_dict() for cls in all_classes]), 200
    
    # If user is a student, show all classes in their workspace
    if user.role == 'student':
        all_classes = scope_query(Class.query.options(joinedload(Class.teacher)), Class).order_by(Class.created_at.desc()).all()
        return jsonify([cls.to_dict() for cls in all_classes]), 200
    
    # For teachers, get classes where user is a member or created
    member_classes = db.session.query(Class).options(joinedload(Class.teacher)).join(ClassMember).filter(
        ClassMember.user_id == current_user_id
    ).all()
    
    # Also include classes created by the user (redundant with scope_query but keeping logic for now)
    created_classes = scope_query(Class.query.options(joinedload(Class.teacher)), Class).filter_by(teacher_id=current_user_id).all()
    
    # Combine and remove duplicates
    all_user_classes = {cls.id: cls for cls in member_classes + created_classes}
    
    return jsonify([cls.to_dict() for cls in all_user_classes.values()]), 200

@classes_bp.route('/<int:class_id>', methods=['GET'])
@jwt_required()
def get_class(class_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    from sqlalchemy.orm import joinedload
    class_obj = scope_query(Class.query.options(joinedload(Class.teacher)), Class).filter_by(id=class_id).first()
    
    if not class_obj:
        return jsonify({'error': 'Class not found'}), 404
    
    # Students can access all classes
    if user.role == 'student':
        return jsonify(class_obj.to_dict()), 200
    
    # For teachers/admins, check if user is a member or creator
    is_admin = user.role in ['admin', 'super_admin']
    member = ClassMember.query.filter_by(class_id=class_id, user_id=current_user_id).first()
    if not is_admin and not member and class_obj.teacher_id != current_user_id:
        return jsonify({'error': 'Not a member'}), 403
    
    return jsonify(class_obj.to_dict()), 200

@classes_bp.route('/join/<class_code>', methods=['POST'])
@jwt_required()
def join_class(class_code):
    current_user_id = get_jwt_identity()
    class_obj = scope_query(Class.query, Class).filter_by(code=class_code).first()
    
    if not class_obj:
        return jsonify({'error': 'Class not found'}), 404
    
    # Check if already a member
    existing = ClassMember.query.filter_by(class_id=class_obj.id, user_id=current_user_id).first()
    if existing:
        return jsonify(class_obj.to_dict()), 200
    
    member = ClassMember(class_id=class_obj.id, user_id=current_user_id, role='student')
    db.session.add(member)
    db.session.commit()
    
    return jsonify(class_obj.to_dict()), 200

@classes_bp.route('/<int:class_id>/members', methods=['GET'])
@jwt_required()
def get_class_members(class_id):
    current_user_id = get_jwt_identity()
    
    # Check if user is a member
    member = ClassMember.query.filter_by(class_id=class_id, user_id=current_user_id).first()
    if not member:
        return jsonify({'error': 'Not a member'}), 403
    
    members = ClassMember.query.filter_by(class_id=class_id).all()
    # Scoping users list too
    class_obj = scope_query(Class.query, Class).filter_by(id=class_id).first()
    if not class_obj:
        return jsonify({'error': 'Class not found or access denied'}), 404
    users = [User.query.get(m.user_id) for m in members]
    
    return jsonify([user.to_dict() for user in users if user]), 200

@classes_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_classes():
    """Get all classes - Admin only"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['admin', 'super_admin']:
        return jsonify({'error': 'Admin access required'}), 403
    
    from sqlalchemy.orm import joinedload
    classes = scope_query(Class.options(joinedload(Class.teacher)), Class).order_by(Class.created_at.desc()).all()
    return jsonify([cls.to_dict() for cls in classes]), 200

@classes_bp.route('/<int:class_id>', methods=['DELETE'])
@jwt_required()
def delete_class(class_id):
    """Delete a class - Admin only or class teacher"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    class_obj = scope_query(Class.query, Class).filter_by(id=class_id).first()
    
    if not class_obj:
        return jsonify({'error': 'Class not found'}), 404
    
    # Check if user is admin or class teacher
    if user.role not in ['admin', 'super_admin'] and class_obj.teacher_id != current_user_id:
        return jsonify({'error': 'You do not have permission to delete this class'}), 403
    
    # Delete all members first (cascade should handle this, but explicit is safer)
    ClassMember.query.filter_by(class_id=class_id).delete()
    
    # Delete the class
    db.session.delete(class_obj)
    db.session.commit()
    
    return jsonify({'message': 'Class deleted successfully'}), 200

