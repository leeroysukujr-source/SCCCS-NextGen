from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.whiteboard import Whiteboard
from app.models import User
from datetime import datetime

whiteboards_bp = Blueprint('whiteboards', __name__)

@whiteboards_bp.route('/', methods=['GET'])
@jwt_required()
def get_whiteboards():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Filter by workspace if applicable
    query = Whiteboard.query.filter(
        (Whiteboard.owner_id == current_user_id) | 
        (Whiteboard.is_public == True)
    )
    
    if user.workspace_id:
        query = query.filter((Whiteboard.workspace_id == user.workspace_id) | (Whiteboard.workspace_id == None))
        
    whiteboards = query.order_by(Whiteboard.updated_at.desc()).all()
    return jsonify([w.to_dict() for w in whiteboards]), 200

@whiteboards_bp.route('/', methods=['POST'])
@jwt_required()
def create_whiteboard():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    data = request.get_json()
    
    new_board = Whiteboard(
        title=data.get('title', 'Untitled Whiteboard'),
        data=data.get('data', '{}'),
        owner_id=current_user_id,
        workspace_id=user.workspace_id,
        is_public=data.get('is_public', False)
    )
    
    db.session.add(new_board)
    db.session.commit()
    
    return jsonify(new_board.to_dict()), 201

@whiteboards_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_whiteboard_detail(id):
    current_user_id = get_jwt_identity()
    board = Whiteboard.query.get_or_404(id)
    
    # Basic permission check
    if board.owner_id != current_user_id and not board.is_public:
        # Check if in same workspace
        user = User.query.get(current_user_id)
        if board.workspace_id and board.workspace_id != user.workspace_id:
            return jsonify({'error': 'Unauthorized'}), 403

    return jsonify({
        **board.to_dict(),
        'data': board.data # Include heavy data only in detail view
    }), 200

@whiteboards_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_whiteboard(id):
    current_user_id = get_jwt_identity()
    board = Whiteboard.query.get_or_404(id)
    
    if board.owner_id != current_user_id:
        # TODO: Add granular 'editor' permissions check here
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    if 'title' in data:
        board.title = data['title']
    if 'data' in data:
        board.data = data['data']
    if 'is_public' in data:
        board.is_public = data['is_public']
        
    board.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(board.to_dict()), 200

@whiteboards_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_whiteboard(id):
    current_user_id = get_jwt_identity()
    board = Whiteboard.query.get_or_404(id)
    
    if board.owner_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    db.session.delete(board)
    db.session.commit()
    
    return jsonify({'message': 'Whiteboard deleted'}), 200
