"""
Polls routes for channels
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Channel, ChannelMember, Message, User
from app.models.chat_features import ChannelPoll, PollVote
from app.utils.logger import log_info, log_error
from app.utils.response import success_response, error_response
from datetime import datetime

polls_bp = Blueprint('polls', __name__)

@polls_bp.route('/channel/<int:channel_id>', methods=['POST'])
@jwt_required()
def create_poll(channel_id):
    """Create a poll in a channel"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    channel = Channel.query.get(channel_id)
    if not channel:
        return error_response('Channel not found', 404)
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(
        channel_id=channel_id,
        user_id=current_user_id
    ).first()
    
    if not member:
        return error_response('Access denied', 403)
    
    question = data.get('question', '').strip()
    options = data.get('options', [])
    is_multiple_choice = data.get('is_multiple_choice', False)
    is_anonymous = data.get('is_anonymous', False)
    expires_at = data.get('expires_at')  # ISO format string or None
    
    if not question:
        return error_response('Question is required', 400)
    
    if not options or len(options) < 2:
        return error_response('At least 2 options are required', 400)
    
    if len(options) > 10:
        return error_response('Maximum 10 options allowed', 400)
    
    # Parse expiration date if provided
    expiration_date = None
    if expires_at:
        try:
            expiration_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except Exception:
            return error_response('Invalid expiration date format', 400)
    
    # Create message for the poll
    message_content = f"📊 Poll: {question}"
    poll_message = Message(
        channel_id=channel_id,
        author_id=current_user_id,
        content=message_content,
        message_type='poll'
    )
    db.session.add(poll_message)
    db.session.flush()
    
    # Create poll
    poll = ChannelPoll(
        channel_id=channel_id,
        message_id=poll_message.id,
        question=question,
        is_multiple_choice=is_multiple_choice,
        is_anonymous=is_anonymous,
        expires_at=expiration_date,
        created_by=current_user_id
    )
    poll.set_options(options)
    db.session.add(poll)
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        message_dict = poll_message.to_dict()
        message_dict['poll'] = poll.to_dict()
        socketio.emit('message_received', message_dict, room=f'channel_{channel_id}')
    except Exception as e:
        log_error(f"Failed to emit poll message: {str(e)}")
    
    return success_response({
        'poll': poll.to_dict(),
        'message': poll_message.to_dict()
    })

@polls_bp.route('/<int:poll_id>/vote', methods=['POST'])
@jwt_required()
def vote_on_poll(poll_id):
    """Vote on a poll"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    option_indices = data.get('option_indices', [])
    
    if not isinstance(option_indices, list):
        return error_response('option_indices must be an array', 400)
    
    poll = ChannelPoll.query.get(poll_id)
    if not poll:
        return error_response('Poll not found', 404)
    
    # Check if poll is active
    if poll.status != 'active':
        return error_response('Poll is no longer active', 400)
    
    # Check expiration
    if poll.expires_at and poll.expires_at < datetime.utcnow():
        poll.status = 'expired'
        db.session.commit()
        return error_response('Poll has expired', 400)
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(
        channel_id=poll.channel_id,
        user_id=current_user_id
    ).first()
    
    if not member:
        return error_response('Access denied', 403)
    
    options = poll.get_options()
    if not option_indices:
        return error_response('At least one option must be selected', 400)
    
    # Validate option indices
    for idx in option_indices:
        if not isinstance(idx, int) or idx < 0 or idx >= len(options):
            return error_response('Invalid option index', 400)
    
    # Check if multiple choice is allowed
    if not poll.is_multiple_choice and len(option_indices) > 1:
        return error_response('Multiple choice is not enabled for this poll', 400)
    
    # Remove existing votes if not multiple choice
    if not poll.is_multiple_choice:
        PollVote.query.filter_by(poll_id=poll_id, user_id=current_user_id).delete()
    
    # Remove duplicate indices
    option_indices = list(set(option_indices))
    
    # Add votes
    for idx in option_indices:
        # Check if vote already exists (for multiple choice)
        existing = PollVote.query.filter_by(
            poll_id=poll_id,
            user_id=current_user_id,
            option_index=idx
        ).first()
        
        if not existing:
            vote = PollVote(
                poll_id=poll_id,
                user_id=current_user_id,
                option_index=idx
            )
            db.session.add(vote)
    
    db.session.commit()
    
    # Get updated results
    results = get_poll_results(poll)
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('poll_vote_updated', {
            'poll_id': poll_id,
            'message_id': poll.message_id,
            'results': results
        }, room=f'channel_{poll.channel_id}')
    except Exception as e:
        log_error(f"Failed to emit poll vote update: {str(e)}")
    
    return success_response({
        'message': 'Vote recorded',
        'results': results
    })

def get_poll_results(poll):
    """Get poll results with vote counts"""
    votes = PollVote.query.filter_by(poll_id=poll.id).all()
    options = poll.get_options()
    
    # Count votes per option
    vote_counts = [0] * len(options)
    total_votes = 0
    
    for vote in votes:
        if 0 <= vote.option_index < len(options):
            vote_counts[vote.option_index] += 1
            total_votes += 1
    
    # Calculate percentages
    results = []
    for i, option in enumerate(options):
        count = vote_counts[i]
        percentage = (count / total_votes * 100) if total_votes > 0 else 0
        results.append({
            'option': option,
            'index': i,
            'count': count,
            'percentage': round(percentage, 1)
        })
    
    return {
        'options': results,
        'total_votes': total_votes,
        'is_multiple_choice': poll.is_multiple_choice,
        'is_anonymous': poll.is_anonymous
    }

@polls_bp.route('/<int:poll_id>/results', methods=['GET'])
@jwt_required()
def get_poll_results_endpoint(poll_id):
    """Get poll results"""
    current_user_id = get_jwt_identity()
    
    poll = ChannelPoll.query.get(poll_id)
    if not poll:
        return error_response('Poll not found', 404)
    
    # Check if user is a member
    member = ChannelMember.query.filter_by(
        channel_id=poll.channel_id,
        user_id=current_user_id
    ).first()
    
    if not member:
        return error_response('Access denied', 403)
    
    results = get_poll_results(poll)
    
    # Include user's votes if not anonymous or user is the creator
    user_votes = []
    if not poll.is_anonymous or poll.created_by == current_user_id:
        votes = PollVote.query.filter_by(poll_id=poll_id, user_id=current_user_id).all()
        user_votes = [v.option_index for v in votes]
    
    results['user_votes'] = user_votes
    
    return success_response(results)

@polls_bp.route('/<int:poll_id>/close', methods=['POST'])
@jwt_required()
def close_poll(poll_id):
    """Close a poll (only creator or admin)"""
    current_user_id = get_jwt_identity()
    
    poll = ChannelPoll.query.get(poll_id)
    if not poll:
        return error_response('Poll not found', 404)
    
    # Check if user is creator or admin
    member = ChannelMember.query.filter_by(
        channel_id=poll.channel_id,
        user_id=current_user_id
    ).first()
    
    is_admin = member and member.role in ['admin', 'co-admin']
    is_creator = poll.created_by == current_user_id
    
    if not is_admin and not is_creator:
        return error_response('Only poll creator or admins can close polls', 403)
    
    poll.status = 'closed'
    db.session.commit()
    
    # Emit via Socket.IO
    try:
        from app import socketio
        socketio.emit('poll_closed', {
            'poll_id': poll_id,
            'message_id': poll.message_id
        }, room=f'channel_{poll.channel_id}')
    except Exception as e:
        log_error(f"Failed to emit poll close event: {str(e)}")
    
    return success_response({'message': 'Poll closed'})

