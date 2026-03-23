from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Feedback, User
from app.models.notifications import Notification
from datetime import datetime

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('', methods=['POST'])
@jwt_required()
def create_feedback():
    """Create feedback - Students and Teachers can send feedback"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    # Students and Teachers can create feedback
    if current_user.role not in ['student', 'teacher', 'admin']:
        return jsonify({'error': 'Unauthorized to submit feedback'}), 403
    
    data = request.get_json()
    
    # Validate required fields
    if not data.get('lecturer_id'):
        return jsonify({'error': 'Recipient is required'}), 400
    if not data.get('subject') or not data.get('subject').strip():
        return jsonify({'error': 'Subject is required'}), 400
    if not data.get('content') or not data.get('content').strip():
        return jsonify({'error': 'Content is required'}), 400
    
    recipient_id = data.get('lecturer_id')
    recipient = User.query.get(recipient_id)
    
    if not recipient:
        return jsonify({'error': 'Recipient not found'}), 404
    
    # Verify recipient is valid (Teacher or Admin)
    # Students can send to Teachers or Admins
    # Teachers can send to Admins
    if current_user.role == 'student' and recipient.role not in ['teacher', 'admin']:
        return jsonify({'error': 'Students can only send feedback to Teachers or Admins'}), 400
    
    if current_user.role == 'teacher' and recipient.role != 'admin':
        return jsonify({'error': 'Teachers can only send feedback to Admins'}), 400
    
    # Don't allow sending to self
    if current_user_id == recipient_id:
        return jsonify({'error': 'Cannot send feedback to yourself'}), 400
    
    # Create feedback
    feedback = Feedback(
        student_id=current_user_id, # Reusing student_id as sender_id
        lecturer_id=recipient_id,   # Reusing lecturer_id as recipient_id
        subject=data.get('subject', '').strip(),
        content=data.get('content', '').strip(),
        category=data.get('category', 'general'),
        priority=data.get('priority', 'normal'),
        status='pending',
        is_anonymous=data.get('is_anonymous', False)
    )
    
    db.session.add(feedback)
    db.session.flush()  # Get feedback ID
    
    # Create notification for recipient
    sender_name = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.username
    display_name = "Anonymous User" if feedback.is_anonymous else sender_name
    
    notification = Notification(
        user_id=recipient_id,
        notification_type='feedback',
        title=f'New feedback from {display_name}',
        message=f'Subject: {feedback.subject}',
        resource_type='feedback',
        resource_id=feedback.id,
        action_url=f'/feedback/{feedback.id}',
        priority='high' if feedback.priority in ['high', 'urgent'] else 'normal'
    )
    db.session.add(notification)
    
    db.session.commit()
    
    return jsonify(feedback.to_dict()), 201

@feedback_bp.route('', methods=['GET'])
@jwt_required()
def get_feedbacks():
    """Get feedbacks - Users see their own sent/received feedbacks"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    # Admins can see ALL feedbacks in the system
    if current_user.role == 'admin':
        feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    else:
        # Users see feedbacks sent BY them (student_id) OR sent TO them (lecturer_id)
        # Note: We reused valid columns for sender/recipient
        feedbacks = Feedback.query.filter(
            (Feedback.student_id == current_user_id) | 
            (Feedback.lecturer_id == current_user_id)
        ).order_by(Feedback.created_at.desc()).all()
    
    return jsonify([fb.to_dict() for fb in feedbacks]), 200

@feedback_bp.route('/broadcast', methods=['POST'])
@jwt_required()
def broadcast_feedback():
    """Broadcast a feedback update/announcement to a group (Admin Only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized. Admin access required'}), 403
    
    data = request.get_json()
    
    target_role = data.get('target_role') # 'student', 'teacher', 'all'
    subject = data.get('subject')
    content = data.get('content')
    
    if not target_role or not subject or not content:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Get recipients
    recipients = []
    if target_role == 'all':
        recipients = User.query.filter(User.role.in_(['student', 'teacher'])).all()
    elif target_role in ['student', 'teacher']:
        recipients = User.query.filter_by(role=target_role).all()
    else:
        return jsonify({'error': 'Invalid target role'}), 400
        
    # Create notifications
    count = 0
    for recipient in recipients:
        if recipient.id == current_user_id: continue
        
        notif = Notification(
            user_id=recipient.id,
            notification_type='announcement',
            title=f'Admin Broadcast: {subject}',
            message=content[:200] + '...' if len(content) > 200 else content,
            resource_type='system',
            resource_id=None, # System announcement
            action_url=None,
            priority='high'
        )
        db.session.add(notif)
        count += 1
    
    db.session.commit()
    
    return jsonify({'message': f'Broadcast sent to {count} users'}), 200

@feedback_bp.route('/<int:feedback_id>', methods=['GET'])
@jwt_required()
def get_feedback(feedback_id):
    """Get a specific feedback"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    feedback = Feedback.query.get(feedback_id)
    if not feedback:
        return jsonify({'error': 'Feedback not found'}), 404
    
    # Admins can see all feedbacks
    if current_user.role == 'admin':
        pass  # Admins can see everything
    # Check permissions - student can see their own, lecturer can see feedbacks sent to them
    elif current_user.role == 'student' and feedback.student_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403
    elif current_user.role in ['teacher'] and feedback.lecturer_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify(feedback.to_dict()), 200

@feedback_bp.route('/<int:feedback_id>/response', methods=['PUT'])
@jwt_required()
def respond_to_feedback(feedback_id):
    """Respond to feedback - Only lecturers can respond"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    feedback = Feedback.query.get(feedback_id)
    if not feedback:
        return jsonify({'error': 'Feedback not found'}), 404
    
    # Admins can respond to any feedback, lecturers only to feedbacks sent to them
    if current_user.role != 'admin' and feedback.lecturer_id != current_user_id:
        return jsonify({'error': 'Only the lecturer or admin can respond to this feedback'}), 403
    
    data = request.get_json()
    response_text = data.get('response', '').strip()
    
    if not response_text:
        return jsonify({'error': 'Response is required'}), 400
    
    # Update feedback with response
    feedback.response = response_text
    feedback.status = data.get('status', 'acknowledged')  # acknowledged, resolved, closed
    feedback.responded_at = datetime.utcnow()
    
    db.session.commit()
    
    # Create notification for student
    lecturer_name = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.username
    
    notification = Notification(
        user_id=feedback.student_id,
        notification_type='feedback_response',
        title=f'Response from {lecturer_name}',
        message=f'Your feedback "{feedback.subject}" has been responded to',
        resource_type='feedback',
        resource_id=feedback.id,
        action_url=f'/feedback/{feedback.id}',
        priority='normal'
    )
    db.session.add(notification)
    db.session.commit()
    
    return jsonify(feedback.to_dict()), 200

@feedback_bp.route('/<int:feedback_id>/status', methods=['PUT'])
@jwt_required()
def update_feedback_status(feedback_id):
    """Update feedback status - Lecturers can update status"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    feedback = Feedback.query.get(feedback_id)
    if not feedback:
        return jsonify({'error': 'Feedback not found'}), 404
    
    # Admins can update any feedback status, lecturers only for feedbacks sent to them
    if current_user.role != 'admin' and feedback.lecturer_id != current_user_id:
        return jsonify({'error': 'Only the lecturer or admin can update feedback status'}), 403
    
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['pending', 'acknowledged', 'resolved', 'closed']:
        return jsonify({'error': 'Invalid status'}), 400
    
    feedback.status = new_status
    if new_status in ['acknowledged', 'resolved', 'closed'] and not feedback.responded_at:
        feedback.responded_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(feedback.to_dict()), 200

@feedback_bp.route('/<int:feedback_id>', methods=['DELETE'])
@jwt_required()
def delete_feedback(feedback_id):
    """Delete feedback - Only student who created it or admin can delete"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    feedback = Feedback.query.get(feedback_id)
    if not feedback:
        return jsonify({'error': 'Feedback not found'}), 404
    
    # Admins can delete any feedback, students only their own
    if current_user.role != 'admin' and feedback.student_id != current_user_id:
        return jsonify({'error': 'Unauthorized. Only the student who created the feedback or admin can delete it.'}), 403
    
    db.session.delete(feedback)
    db.session.commit()
    
    return jsonify({'message': 'Feedback deleted successfully'}), 200

@feedback_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_feedback_stats():
    """Get feedback statistics - For lecturers and admins"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role not in ['teacher', 'admin']:
        return jsonify({'error': 'Only lecturers and admins can view feedback statistics'}), 403
    
    # Admins see all feedbacks, lecturers see only feedbacks sent to them
    if current_user.role == 'admin':
        feedbacks = Feedback.query.all()
    else:
        feedbacks = Feedback.query.filter_by(lecturer_id=current_user_id).all()
    
    stats = {
        'total': len(feedbacks),
        'pending': len([f for f in feedbacks if f.status == 'pending']),
        'acknowledged': len([f for f in feedbacks if f.status == 'acknowledged']),
        'resolved': len([f for f in feedbacks if f.status == 'resolved']),
        'closed': len([f for f in feedbacks if f.status == 'closed']),
        'by_category': {},
        'by_priority': {}
    }
    
    for feedback in feedbacks:
        # Count by category
        stats['by_category'][feedback.category] = stats['by_category'].get(feedback.category, 0) + 1
        
        # Count by priority
        stats['by_priority'][feedback.priority] = stats['by_priority'].get(feedback.priority, 0) + 1
    
    return jsonify(stats), 200

