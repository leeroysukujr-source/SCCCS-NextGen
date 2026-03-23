
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, TutorProfile, TutorSession
from datetime import datetime
import json
from flask_cors import cross_origin

tutoring_bp = Blueprint('tutoring', __name__)

@tutoring_bp.route('/tutors', methods=['POST'])
@cross_origin()
@jwt_required()
def register_tutor():
    """Register as a tutor"""
    user_id = get_jwt_identity()
    
    # Check if already a tutor
    existing = TutorProfile.query.filter_by(user_id=user_id).first()
    if existing:
        return jsonify({'error': 'You are already registered as a tutor'}), 400
    
    data = request.get_json()
    
    profile = TutorProfile(
        user_id=user_id,
        bio=data.get('bio', ''),
        subjects=data.get('subjects', ''), # Expecting comma-separated string or joining list
        hourly_rate=data.get('hourly_rate', 0.0),
        availability=json.dumps(data.get('availability', {}))
    )
    
    db.session.add(profile)
    db.session.commit()
    
    return jsonify(profile.to_dict()), 201

@tutoring_bp.route('/tutors', methods=['GET'])
@cross_origin()
@jwt_required()
def get_tutors():
    """List all tutors with optional filters"""
    subject = request.args.get('subject')
    
    query = TutorProfile.query
    
    if subject:
        # Simple LIKE search for now
        query = query.filter(TutorProfile.subjects.ilike(f'%{subject}%'))
    
    tutors = query.order_by(TutorProfile.rating.desc()).all()
    return jsonify([t.to_dict() for t in tutors]), 200

@tutoring_bp.route('/tutors/<int:tutor_id>', methods=['GET'])
@cross_origin()
@jwt_required()
def get_tutor_profile(tutor_id):
    """Get a specific tutor profile"""
    # tutor_id here is actually the TutorProfile ID, not User ID (usually)
    # But let's support looking up by ID
    profile = TutorProfile.query.get(tutor_id)
    if not profile:
        return jsonify({'error': 'Tutor not found'}), 404
    
    return jsonify(profile.to_dict()), 200

@tutoring_bp.route('/tutors/<int:tutor_profile_id>/book', methods=['POST'])
@cross_origin()
@jwt_required()
def book_session(tutor_profile_id):
    """Book a session with a tutor"""
    student_id = get_jwt_identity()
    profile = TutorProfile.query.get(tutor_profile_id)
    
    if not profile:
        return jsonify({'error': 'Tutor not found'}), 404
        
    if profile.user_id == int(student_id):
         return jsonify({'error': 'Cannot book a session with yourself'}), 400
    
    data = request.get_json()
    subject = data.get('subject')
    scheduled_at_str = data.get('scheduled_at') # ISO format
    
    if not subject or not scheduled_at_str:
        return jsonify({'error': 'Subject and scheduled time are required'}), 400
        
    try:
        scheduled_at = datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00'))
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    session = TutorSession(
        tutor_id=profile.user_id,
        student_id=student_id,
        subject=subject,
        scheduled_at=scheduled_at,
        status='pending'
    )
    
    db.session.add(session)
    db.session.commit()
    
    return jsonify(session.to_dict()), 201

@tutoring_bp.route('/sessions', methods=['GET'])
@cross_origin()
@jwt_required()
def get_my_sessions():
    """Get sessions for the current user (as student or tutor)"""
    user_id = get_jwt_identity()
    user_id = int(user_id)
    
    # As student
    learning = TutorSession.query.filter_by(student_id=user_id).order_by(TutorSession.scheduled_at.desc()).all()
    
    # As tutor
    tutoring = TutorSession.query.filter_by(tutor_id=user_id).order_by(TutorSession.scheduled_at.desc()).all()
    
    return jsonify({
        'learning': [s.to_dict() for s in learning],
        'tutoring': [s.to_dict() for s in tutoring]
    }), 200

@tutoring_bp.route('/sessions/<int:session_id>', methods=['PUT'])
@cross_origin()
@jwt_required()
def update_session(session_id):
    """Update session status (confirm/cancel)"""
    user_id = int(get_jwt_identity())
    session = TutorSession.query.get(session_id)
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    # Only tutor can confirm, either can cancel
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status == 'confirmed':
        if session.tutor_id != user_id:
            return jsonify({'error': 'Only the tutor can confirm this session'}), 403
        session.status = 'confirmed'
        # Generate a meeting link (simple placeholder or a real generated room)
        session.meeting_link = f"/study-room/live/tutor-session-{session.id}"
        
    elif new_status == 'cancelled':
        if session.tutor_id != user_id and session.student_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        session.status = 'cancelled'
    
    db.session.commit()
    return jsonify(session.to_dict()), 200
