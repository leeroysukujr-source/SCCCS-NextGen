"""
Analytics Utilities for Enterprise Features
"""
from datetime import datetime, timedelta
from app import db
from app.models.analytics import UserActivity, EngagementMetrics, SystemMetrics
from app.models import User, Channel, Class, Message, File
from sqlalchemy import func, and_

def track_activity(user_id, activity_type, resource_type=None, resource_id=None, 
                  metadata=None, ip_address=None, user_agent=None):
    """Track user activity"""
    try:
        activity = UserActivity(
            user_id=user_id,
            activity_type=activity_type,
            resource_type=resource_type,
            resource_id=resource_id,
            meta_data=json.dumps(metadata) if metadata else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(activity)
        db.session.commit()
        return activity
    except Exception as e:
        db.session.rollback()
        print(f"Error tracking activity: {e}")
        return None

def get_user_engagement_stats(user_id, days=30):
    """Get user engagement statistics"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    activities = UserActivity.query.filter(
        and_(
            UserActivity.user_id == user_id,
            UserActivity.created_at >= start_date
        )
    ).all()
    
    stats = {
        'total_activities': len(activities),
        'messages_sent': len([a for a in activities if a.activity_type == 'message_sent']),
        'files_uploaded': len([a for a in activities if a.activity_type == 'file_uploaded']),
        'classes_joined': len([a for a in activities if a.activity_type == 'class_joined']),
        'lessons_completed': len([a for a in activities if a.activity_type == 'lesson_completed']),
        'logins': len([a for a in activities if a.activity_type == 'login']),
    }
    
    return stats

def get_system_analytics():
    """Get comprehensive system analytics"""
    total_users = User.query.count()
    active_users = User.query.filter(User.is_active == True).count()
    total_classes = Class.query.count()
    total_channels = Channel.query.count()
    total_messages = Message.query.count()
    total_files = File.query.count()
    
    # Recent activity (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_activities = UserActivity.query.filter(
        UserActivity.created_at >= yesterday
    ).count()
    
    # Active users (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    active_recent = UserActivity.query.filter(
        and_(
            UserActivity.created_at >= week_ago,
            UserActivity.activity_type == 'login'
        )
    ).distinct(UserActivity.user_id).count()
    
    return {
        'total_users': total_users,
        'active_users': active_users,
        'total_classes': total_classes,
        'total_channels': total_channels,
        'total_messages': total_messages,
        'total_files': total_files,
        'recent_activities_24h': recent_activities,
        'active_users_7d': active_recent,
    }

def record_system_metric(metric_type, metric_value, metadata=None):
    """Record system performance metric"""
    try:
        metric = SystemMetrics(
            metric_type=metric_type,
            metric_value=metric_value,
            meta_data=json.dumps(metadata) if metadata else None
        )
        db.session.add(metric)
        db.session.commit()
        return metric
    except Exception as e:
        db.session.rollback()
        print(f"Error recording metric: {e}")
        return None

