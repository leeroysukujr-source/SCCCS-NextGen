from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Lesson, Class, ClassMember, User, LessonLink
from datetime import datetime

lessons_bp = Blueprint('lessons', __name__)

@lessons_bp.route('/class/<int:class_id>', methods=['POST'])
@jwt_required()
def create_lesson(class_id):
    current_user_id = get_jwt_identity()
    
    # Check if user is a member and has permission
    class_obj = Class.query.get(class_id)
    if not class_obj:
        return jsonify({'error': 'Class not found'}), 404
    
    member = ClassMember.query.filter_by(class_id=class_id, user_id=current_user_id).first()
    if not member:
        return jsonify({'error': 'Not a member'}), 403
    
    if member.role not in ['teacher', 'ta'] and class_obj.teacher_id != current_user_id:
        return jsonify({'error': 'Only teachers can create lessons'}), 403
    
    data = request.get_json()
    
    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except:
            pass
    
    lesson = Lesson(
        class_id=class_id,
        title=data.get('title', ''),
        description=data.get('description', ''),
        content=data.get('content', ''),
        due_date=due_date,
        created_by=current_user_id
    )
    
    db.session.add(lesson)
    db.session.commit()
    
    return jsonify(lesson.to_dict()), 201

@lessons_bp.route('/class/<int:class_id>', methods=['GET'])
@jwt_required()
def get_lessons(class_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Students can access all classes
    if user.role == 'student':
        lessons = Lesson.query.filter_by(class_id=class_id).order_by(Lesson.created_at.desc()).all()
        return jsonify([lesson.to_dict() for lesson in lessons]), 200
    
    # For teachers/admins, check if user is a member or creator
    is_admin = user.role in ['admin', 'super_admin']
    member = ClassMember.query.filter_by(class_id=class_id, user_id=current_user_id).first()
    class_obj = Class.query.get(class_id)
    
    if not is_admin and not member and (not class_obj or class_obj.teacher_id != current_user_id):
        return jsonify({'error': 'Not a member'}), 403
    
    lessons = Lesson.query.filter_by(class_id=class_id).order_by(Lesson.created_at.desc()).all()
    
    return jsonify([lesson.to_dict() for lesson in lessons]), 200

@lessons_bp.route('/<int:lesson_id>', methods=['GET'])
@jwt_required()
def get_lesson(lesson_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    lesson = Lesson.query.get(lesson_id)
    
    if not lesson:
        return jsonify({'error': 'Lesson not found'}), 404
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Students can access all lessons
    if user.role == 'student':
        return jsonify(lesson.to_dict()), 200
    
    # For teachers/admins, check if user is a member or creator
    is_admin = user.role in ['admin', 'super_admin']
    member = ClassMember.query.filter_by(class_id=lesson.class_id, user_id=current_user_id).first()
    class_obj = Class.query.get(lesson.class_id)
    
    if not is_admin and not member and (not class_obj or class_obj.teacher_id != current_user_id):
        return jsonify({'error': 'Not a member'}), 403
    
    return jsonify(lesson.to_dict()), 200

@lessons_bp.route('/<int:lesson_id>', methods=['PUT'])
@jwt_required()
def update_lesson(lesson_id):
    current_user_id = get_jwt_identity()
    lesson = Lesson.query.get(lesson_id)
    
    if not lesson:
        return jsonify({'error': 'Lesson not found'}), 404
    
    # Check permission
    class_obj = Class.query.get(lesson.class_id)
    if lesson.created_by != current_user_id and class_obj.teacher_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if 'title' in data:
        lesson.title = data['title']
    if 'description' in data:
        lesson.description = data['description']
    if 'content' in data:
        lesson.content = data['content']
    if 'due_date' in data:
        try:
            lesson.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except:
            pass
    
    db.session.commit()
    
    return jsonify(lesson.to_dict()), 200

@lessons_bp.route('/<int:lesson_id>', methods=['DELETE'])
@jwt_required()
def delete_lesson(lesson_id):
    current_user_id = get_jwt_identity()
    lesson = Lesson.query.get(lesson_id)
    
    if not lesson:
        return jsonify({'error': 'Lesson not found'}), 404
    
    # Check permission
    class_obj = Class.query.get(lesson.class_id)
    user = User.query.get(current_user_id)
    if lesson.created_by != current_user_id and class_obj.teacher_id != current_user_id and user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(lesson)
    db.session.commit()
    
    return jsonify({'message': 'Lesson deleted'}), 200

@lessons_bp.route('/<int:lesson_id>/materials', methods=['GET'])
@jwt_required()
def get_lesson_materials(lesson_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    lesson = Lesson.query.get(lesson_id)
    
    if not lesson:
        return jsonify({'error': 'Lesson not found'}), 404
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Students can access all lesson materials
    if user.role == 'student':
        pass  # Allow access
    else:
        # For teachers/admins, check if user is a member or creator
        is_admin = user.role in ['admin', 'super_admin']
        member = ClassMember.query.filter_by(class_id=lesson.class_id, user_id=current_user_id).first()
        class_obj = Class.query.get(lesson.class_id)
        if not is_admin and not member and (not class_obj or class_obj.teacher_id != current_user_id):
            return jsonify({'error': 'Not a member'}), 403
    
    # Get all files attached to this lesson
    from app.models import File
    files = File.query.filter_by(lesson_id=lesson_id).all()
    
    return jsonify([f.to_dict() for f in files]), 200

@lessons_bp.route('/<int:lesson_id>/links', methods=['POST'])
@jwt_required()
def add_lesson_link(lesson_id):
    current_user_id = get_jwt_identity()
    lesson = Lesson.query.get(lesson_id)
    
    if not lesson:
        return jsonify({'error': 'Lesson not found'}), 404
    
    # Check permission
    class_obj = Class.query.get(lesson.class_id)
    member = ClassMember.query.filter_by(class_id=lesson.class_id, user_id=current_user_id).first()
    user = User.query.get(current_user_id)
    
    if not member and (user.role != 'admin' and class_obj.teacher_id != current_user_id):
        return jsonify({'error': 'Not a member'}), 403
    
    if member and member.role not in ['teacher', 'ta'] and class_obj.teacher_id != current_user_id and user.role != 'admin':
        return jsonify({'error': 'Only teachers can add links'}), 403
    
    data = request.get_json()
    
    if not data.get('url') or not data.get('title'):
        return jsonify({'error': 'Title and URL are required'}), 400
    
    # Validate URL
    url = data.get('url', '').strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    link = LessonLink(
        lesson_id=lesson_id,
        title=data.get('title', '').strip(),
        url=url,
        description=data.get('description', '').strip() if data.get('description') else '',
        created_by=current_user_id
    )
    
    db.session.add(link)
    db.session.commit()
    
    return jsonify(link.to_dict()), 201

@lessons_bp.route('/<int:lesson_id>/links', methods=['GET'])
@jwt_required()
def get_lesson_links(lesson_id):
    current_user_id = get_jwt_identity()
    lesson = Lesson.query.get(lesson_id)
    
    if not lesson:
        return jsonify({'error': 'Lesson not found'}), 404
    
    # Check if user is a member of the class
    member = ClassMember.query.filter_by(class_id=lesson.class_id, user_id=current_user_id).first()
    if not member:
        user = User.query.get(current_user_id)
        class_obj = Class.query.get(lesson.class_id)
        if user.role != 'admin' and class_obj.teacher_id != current_user_id:
            return jsonify({'error': 'Not a member'}), 403
    
    links = LessonLink.query.filter_by(lesson_id=lesson_id).order_by(LessonLink.created_at.desc()).all()
    
    return jsonify([l.to_dict() for l in links]), 200

@lessons_bp.route('/links/<int:link_id>', methods=['DELETE'])
@jwt_required()
def delete_lesson_link(link_id):
    current_user_id = get_jwt_identity()
    link = LessonLink.query.get(link_id)
    
    if not link:
        return jsonify({'error': 'Link not found'}), 404
    
    # Check permission
    lesson = Lesson.query.get(link.lesson_id)
    class_obj = Class.query.get(lesson.class_id)
    user = User.query.get(current_user_id)
    
    if link.created_by != current_user_id and class_obj.teacher_id != current_user_id and user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(link)
    db.session.commit()
    
    return jsonify({'message': 'Link deleted'}), 200
