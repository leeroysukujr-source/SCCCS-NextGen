from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Document, Submission, User
from datetime import datetime
import json

academic_bp = Blueprint('academic', __name__)

@academic_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_assignment():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    assignment_id = data.get('assignment_id')
    work_doc_id = data.get('work_doc_id')
    
    # Check if existing submission
    existing = Submission.query.filter_by(assignment_doc_id=assignment_id, student_id=current_user_id).first()
    if existing:
        existing.work_doc_id = work_doc_id
        existing.submitted_at = datetime.utcnow()
        existing.status = 'resubmitted'
    else:
        new_sub = Submission(
            assignment_doc_id=assignment_id,
            student_id=current_user_id,
            work_doc_id=work_doc_id,
            status='submitted'
        )
        db.session.add(new_sub)
        
    db.session.commit()
    return jsonify({'message': 'Submitted successfully'}), 201

@academic_bp.route('/assignment/<int:id>/submissions', methods=['GET'])
@jwt_required()
def get_submissions(id):
    current_user_id = get_jwt_identity()
    doc = Document.query.get_or_404(id)
    
    # Only owner of assignment (teacher) can see all submissions
    if doc.owner_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    submissions = Submission.query.filter_by(assignment_doc_id=id).all()
    return jsonify([s.to_dict() for s in submissions]), 200

@academic_bp.route('/submission/<int:id>/grade', methods=['POST'])
@jwt_required()
def grade_submission(id):
    current_user_id = get_jwt_identity()
    sub = Submission.query.get_or_404(id)
    assign_doc = Document.query.get(sub.assignment_doc_id)
    
    if assign_doc.owner_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    sub.grade = data.get('grade')
    sub.feedback = data.get('feedback')
    sub.rubric_scores = json.dumps(data.get('rubric_scores', {}))
    sub.status = 'graded'
    
    db.session.commit()
    return jsonify({'message': 'Graded successfully'}), 200
