"""
Database Migration Script for Enterprise Features
Run this to add all new enterprise tables to the database
"""
from app import create_app, db
from config import Config
# Import base models from models.py
import app.models as base_models
# Import enterprise models
from app.models.analytics import UserActivity, SystemMetrics, EngagementMetrics
from app.models.security import UserSession, TwoFactorAuth, AuditLog, SecurityEvent
from app.models.notifications import NotificationPreference, Notification
from app.models.collaboration import Presence, FileVersion, CollaborationSession
from app.models.integrations import Webhook, WebhookDelivery, APIToken

def migrate_database():
    """Create all enterprise tables"""
    app = create_app(Config)
    
    with app.app_context():
        print("Creating enterprise database tables...")
        
        # Create all tables
        db.create_all()
        
        print("✓ UserActivity table created")
        print("✓ SystemMetrics table created")
        print("✓ EngagementMetrics table created")
        print("✓ UserSession table created")
        print("✓ TwoFactorAuth table created")
        print("✓ AuditLog table created")
        print("✓ SecurityEvent table created")
        print("✓ NotificationPreference table created")
        print("✓ Notification table created")
        print("✓ Presence table created")
        print("✓ FileVersion table created")
        print("✓ CollaborationSession table created")
        print("✓ Webhook table created")
        print("✓ WebhookDelivery table created")
        print("✓ APIToken table created")
        
        print("\n✅ Enterprise database migration completed successfully!")

if __name__ == '__main__':
    migrate_database()

