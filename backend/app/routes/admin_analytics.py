from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User

admin_analytics_bp = Blueprint('admin_analytics', __name__)


@admin_analytics_bp.route('/analytics/overview', methods=['GET'])
@jwt_required()
def analytics_overview():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'admin required'}), 403

    # Placeholder: return basic counts and sample metrics
    from app import db
    from app.models import User as UserModel
    user_count = UserModel.query.count()
    # Other metrics can be added here (messages, active users, storage usage)

    return jsonify({
        'users': user_count,
        'notes': 'Extend this endpoint to include messages, rooms, and storage metrics.'
    }), 200
