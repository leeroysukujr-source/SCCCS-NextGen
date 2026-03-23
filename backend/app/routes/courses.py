from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, User, Channel, ChannelMember, Assignment, AssignmentGroup
from sqlalchemy import func
import traceback

courses_bp = Blueprint('courses', __name__, url_prefix='/courses')

@courses_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_courses():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    try:
        # Lecturer courses: owned by user, type='course'
        courses = Channel.query.filter_by(
            type='course',
            created_by=current_user_id,
            workspace_id=user.workspace_id
        ).order_by(Channel.created_at.desc()).all()
        
        results = []
        for c in courses:
            # Students: members with role != admin/owner
            # Usually role='member'
            student_count = ChannelMember.query.filter(
                ChannelMember.channel_id == c.id,
                ChannelMember.role != 'admin',
                ChannelMember.role != 'owner'
            ).count()
            
            assignment_count = Assignment.query.filter_by(channel_id=c.id).count()
            
            # Groups via assignments
            group_count = db.session.query(func.count(AssignmentGroup.id)).join(Assignment, AssignmentGroup.assignment_id == Assignment.id).filter(Assignment.channel_id == c.id).scalar()
            
            results.append({
                **c.to_dict(),
                'stats': {
                    'students': student_count,
                    'assignments': assignment_count,
                    'groups': group_count or 0
                }
            })
            
        return jsonify(results)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@courses_bp.route('/<int:channel_id>/students', methods=['GET'])
@jwt_required()
def get_course_students(channel_id):
    current_user_id = get_jwt_identity()
    channel = Channel.query.get_or_404(channel_id)
    
    if channel.created_by != current_user_id and channel.type == 'course':
        # Ensure requester is owner for full data access
        return jsonify({"error": "Unauthorized"}), 403
        
    # Get students
    members = ChannelMember.query.filter(
        ChannelMember.channel_id == channel_id,
        ChannelMember.role != 'admin',
        ChannelMember.role != 'owner'
    ).all()
    
    students = []
    for m in members:
        u = m.user
        students.append({
            'id': u.id,
            'name': f"{u.first_name} {u.last_name}",
            'email': u.email,
            'username': u.username,
            'joined_at': m.joined_at.isoformat(),
            # 'department': u.department if hasattr(u, 'department') else 'N/A'
        })
        
    return jsonify(students)
