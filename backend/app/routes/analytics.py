"""
Advanced Analytics Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, AuditLog
from app.models.analytics import UserActivity, EngagementMetrics, SystemMetrics
from app.utils.analytics import get_user_engagement_stats, get_system_analytics
from datetime import datetime, timedelta
from sqlalchemy import func, and_

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/audit/logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """Get audit logs for the workspace"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or (user.role != 'admin' and user.role != 'super_admin'):
        return jsonify({'error': 'Admin access required'}), 403
        
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = AuditLog.query
    
    if user.role != 'super_admin':
        if hasattr(AuditLog, 'workspace_id'):
             query = query.filter_by(workspace_id=user.workspace_id)
        
    logs = query.order_by(AuditLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'logs': [log.to_dict() for log in logs.items],
        'total': logs.total,
        'pages': logs.pages,
        'current_page': logs.page
    }), 200


@analytics_bp.route('/user/engagement', methods=['GET'])
@jwt_required()
def get_user_engagement():
    """Get current user's engagement statistics"""
    current_user_id = get_jwt_identity()
    days = request.args.get('days', 30, type=int)
    
    stats = get_user_engagement_stats(current_user_id, days)
    
    # Get engagement metrics
    start_date = datetime.utcnow() - timedelta(days=days)
    metrics = EngagementMetrics.query.filter(
        and_(
            EngagementMetrics.user_id == current_user_id,
            EngagementMetrics.date >= start_date.date()
        )
    ).all()
    
    return jsonify({
        'stats': stats,
        'daily_metrics': [m.to_dict() for m in metrics]
    }), 200

@analytics_bp.route('/user/activity', methods=['GET'])
@jwt_required()
def get_user_activity():
    """Get user activity log"""
    current_user_id = get_jwt_identity()
    limit = request.args.get('limit', 50, type=int)
    activity_type = request.args.get('type')
    
    query = UserActivity.query.filter(UserActivity.user_id == current_user_id)
    if activity_type:
        query = query.filter(UserActivity.activity_type == activity_type)
    
    activities = query.order_by(UserActivity.created_at.desc()).limit(limit).all()
    
    return jsonify([a.to_dict() for a in activities]), 200

@analytics_bp.route('/system/overview', methods=['GET'])
@jwt_required()
def get_system_overview():
    """Get system overview analytics (admin/super_admin)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or (user.role != 'admin' and user.role != 'super_admin'):
        return jsonify({'error': 'Admin access required'}), 403
    
    from app.models import Workspace
    
    overview = {}
    
    if user.role == 'super_admin':
        # Global Stats
        total_users = User.query.count()
        total_workspaces = Workspace.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        
        overview = {
            'total_users': total_users,
            'total_workspaces': total_workspaces,
            'active_users': active_users,
            'role': 'super_admin'
        }
    else:
        # Workspace Specific Stats
        workspace_id = user.workspace_id
        workspace_users = User.query.filter_by(workspace_id=workspace_id).count()
        workspace_students = User.query.filter_by(workspace_id=workspace_id, role='student').count()
        workspace_teachers = User.query.filter_by(workspace_id=workspace_id, role='teacher').count()
        
        overview = {
            'total_users': workspace_users,
            'total_students': workspace_students,
            'total_teachers': workspace_teachers,
            'role': 'admin',
            'workspace_name': user.workspace_obj.name if user.workspace_obj else 'System'
        }
    
    # Get recent metrics (Placeholder logic for now, can be expanded)
    recent_metrics = [] 
    
    return jsonify({
        'overview': overview,
        'recent_metrics': recent_metrics
    }), 200

@analytics_bp.route('/system/metrics', methods=['POST'])
@jwt_required()
def record_metric():
    """Record a system metric (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    metric_type = data.get('metric_type')
    metric_value = data.get('metric_value')
    metadata = data.get('metadata')
    
    if not metric_type or metric_value is None:
        return jsonify({'error': 'metric_type and metric_value are required'}), 400
    
    from app.utils.analytics import record_system_metric
    metric = record_system_metric(metric_type, metric_value, metadata)
    
    if metric:
        return jsonify(metric.to_dict()), 201
    else:
        return jsonify({'error': 'Failed to record metric'}), 500


@analytics_bp.route('/user/growth', methods=['GET'])
@jwt_required()
def get_user_growth():
    '''Get user growth data (monthly)'''
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or (user.role != 'admin' and user.role != 'super_admin'):
        return jsonify({'error': 'Admin access required'}), 403
        
    # Mock data for demonstration - in prod this would be a complex group_by date query
    from datetime import datetime, timedelta
    import random
    
    months = []
    data = []
    
    for i in range(5, -1, -1):
        date = datetime.now() - timedelta(days=i*30)
        months.append(date.strftime('%b'))
        
        # Super admin sees bigger numbers
        base = 1000 if user.role == 'super_admin' else 50
        variance = random.randint(10, 50)
        data.append(base + (5-i)*variance)
        
    return jsonify({
        'labels': months,
        'data': data
    }), 200

@analytics_bp.route('/activity/trends', methods=['GET'])
@jwt_required()
def get_activity_trends():
    '''Get activity trends (daily active users)'''
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or (user.role != 'admin' and user.role != 'super_admin'):
        return jsonify({'error': 'Admin access required'}), 403
        
    # Mock data for trends
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    # Super admin sees global activity
    base = 500 if user.role == 'super_admin' else 20
    
    active = [base + x for x in [12, 45, 30, 60, 45, 20, 15]]
    new_users = [base/10 + x for x in [2, 5, 3, 6, 4, 1, 1]]
    
    return jsonify({
        'labels': days,
        'datasets': [
            {'label': 'Active Users', 'data': active, 'color': '#6366f1'},
            {'label': 'New Registrations', 'data': new_users, 'color': '#10b981'}
        ]
    }), 200

