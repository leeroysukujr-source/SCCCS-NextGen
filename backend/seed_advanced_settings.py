
import sys
import os
from datetime import datetime

# Add the backend directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.services.settings_service import settings_service

def seed_advanced_settings():
    app = create_app()
    with app.app_context():
        print("--- Seeding Advanced System Settings ---")

        # 1. General Settings
        settings_service.set_system_setting(
            'APP_NAME', 'SCCCS Master Edition', 
            category='general', value_type='string', 
            description='Main application name displayed in sidebar and title.', 
            is_public=True
        )
        settings_service.set_system_setting(
            'MAINTENANCE_MODE', False, 
            category='general', value_type='bool', 
            description='Disable non-admin access and show maintenance page.', 
            is_public=True
        )

        # 2. Security Settings
        settings_service.set_system_setting(
            'MIN_PASSWORD_LENGTH', 8, 
            category='security', value_type='int', 
            description='Minimum characters required for user passwords.', 
            is_public=False
        )
        settings_service.set_system_setting(
            'SESSION_TIMEOUT_MINS', 60, 
            category='security', value_type='int', 
            description='Inactivity period before user is logged out (minutes).', 
            is_public=False
        )
        settings_service.set_system_setting(
            'MAX_LOGIN_ATTEMPTS', 5, 
            category='security', value_type='int', 
            description='Number of failed logins allowed before temporary lockout.', 
            is_public=False
        )
        settings_service.set_system_setting(
            'TWO_FACTOR_REQUIRED', False, 
            category='security', value_type='bool', 
            description='Force all administrative users to enable 2FA.', 
            is_public=False
        )

        # 3. UX/UI Settings
        settings_service.set_system_setting(
            'PRIMARY_COLOR', '#3b82f6', 
            category='ui_ux', value_type='string', 
            description='Primary brand color (Blue by default).', 
            is_public=True
        )
        settings_service.set_system_setting(
            'SECONDARY_COLOR', '#6366f1', 
            category='ui_ux', value_type='string', 
            description='Secondary accent color (Indigo by default).', 
            is_public=True
        )
        settings_service.set_system_setting(
            'BORDER_RADIUS', '0.75rem', 
            category='ui_ux', value_type='string', 
            description='Standard corner rounding for UI elements.', 
            is_public=True
        )
        settings_service.set_system_setting(
            'DASHBOARD_ANALYTICS_VISIBLE', True, 
            category='ui_ux', value_type='bool', 
            description='Show analytics charts on the main dashboard for all users.', 
            is_public=True
        )
        # Added based on check_db_settings output
        settings_service.set_system_setting(
            'SYSTEM_LOGO_URL', '/static/uploads/logo.png',
            category='ui_ux', value_type='string',
            description='URL for the system logo.',
            is_public=True
        )

        # 4. Communication Settings
        settings_service.set_system_setting(
            'SYSTEM_EMAIL', 'support@scccs.edu', 
            category='communication', value_type='string', 
            description='Sender email address for system notifications.', 
            is_public=True
        )
        settings_service.set_system_setting(
            'WELCOME_MESSAGE', 'Welcome to SCCCS Educational OS', 
            category='communication', value_type='string', 
            description='Message shown to users immediately after login.', 
            is_public=True
        )
        settings_service.set_system_setting(
            'ENABLE_GLOBAL_ANNOUNCEMENTS', True, 
            category='communication', value_type='bool', 
            description='Allow Super Admins to broadcast messages to all users.', 
            is_public=True
        )
        
        # --- Frontend Specific Keys ---
        settings_service.set_system_setting(
            'siteName', 'SCCCS Portal',
            category='general', value_type='string',
            description='Public facing name of the site.',
            is_public=True
        )
        settings_service.set_system_setting(
            'maxFileSize', 50,
            category='ui_ux', value_type='int',
            description='Maximum file upload size in MB.',
            is_public=True
        )
        settings_service.set_system_setting(
            'allowedFileTypes', '.pdf,.jpg,.png,.doc,.docx',
            category='ui_ux', value_type='string',
            description='Comma separated list of allowed file extensions.',
            is_public=True
        )
        settings_service.set_system_setting(
            'enableNotifications', True,
            category='communication', value_type='bool',
            description='Enable in-app notifications system.',
            is_public=True
        )
        settings_service.set_system_setting(
            'enableEmailNotifications', True,
            category='communication', value_type='bool',
            description='Enable email dispatch for critical alerts.',
            is_public=True
        )

        print("--- Advanced settings seeded successfully! ---")

if __name__ == "__main__":
    seed_advanced_settings()
