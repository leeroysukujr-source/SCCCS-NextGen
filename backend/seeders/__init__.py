
from app import create_app, db
from app.models import GlobalFeatureFlag
from app.models.system_settings import SystemSetting
import json

def run_all_seeders(app=None):
    if app is None:
        app = create_app()
    with app.app_context():
        print("--- RUNNING AUTOMATED SEEDING ENGINE ---")
        
        # 1. GLOBAL FEATURE FLAGS
        features = [
            ('video_room', 'LiveKit Integration for video conferencing', True),
            ('messaging', 'Socket.IO & Redis based real-time messaging', True),
            ('channels', 'Channel-based communication', True),
            ('messages', 'Direct messaging and advanced chat', True),
            ('ai_assistant', 'Gemini API powered AI Study Assistant', True),
            ('study_hub', 'AI-augmented study documents and hub', True),
            ('course_hub', 'Centralized course management', True),
            ('assignments', 'Student assignment tracking and submission', True),
            ('gradebook', 'Academic performance and grading engine', True),
            ('classes', 'Classroom management and scheduling', True),
            ('user_registration', 'Public or invite-only user onboarding', True),
            ('workspace_creation', 'Institutional and campus workspace factory', True),
            ('search', 'Global architectural search engine', True)
        ]
        
        print("\n[Sync] Global Feature Flags...")
        for name, desc, enabled in features:
            flag = GlobalFeatureFlag.query.filter_by(name=name).first()
            if not flag:
                print(f"  + Added: {name}")
                flag = GlobalFeatureFlag(name=name, description=desc, is_enabled=enabled, config=json.dumps({}))
                db.session.add(flag)
            else:
                flag.description = desc
                flag.is_enabled = enabled
        
        # 2. SYSTEM SETTINGS
        settings = [
            {'key': 'APP_NAME', 'value': 'SCCCS NextGen', 'category': 'general', 'type': 'string', 'desc': 'Application branding name'},
            {'key': 'SUPPORT_EMAIL', 'value': 'globalimpactinnovators26@gmail.com', 'category': 'general', 'type': 'string', 'desc': 'Official support contact email'},
            {'key': 'MAX_LOGIN_ATTEMPTS', 'value': 5, 'category': 'security', 'type': 'number', 'desc': 'Brute-force protection threshold'},
            {'key': 'TOKEN_EXPIRATION', 'value': 3600, 'category': 'security', 'type': 'number', 'desc': 'JWT token lifetime in seconds'},
            {'key': 'REQUIRE_2FA', 'value': True, 'category': 'security', 'type': 'boolean', 'desc': 'Enforce Two-Factor Authentication system-wide'},
            {'key': 'LIVEKIT_URL', 'value': '', 'category': 'communication', 'type': 'string', 'desc': 'LiveKit server endpoint for conferencing'},
            {'key': 'REDIS_URL_PUBLIC', 'value': '', 'category': 'communication', 'type': 'string', 'desc': 'Public Redis endpoint for state management'},
            {'key': 'WSS_ENABLED', 'value': True, 'category': 'communication', 'type': 'boolean', 'desc': 'Enable Secure WebSockets (WSS)'},
            {'key': 'THEME_DEFAULT', 'value': 'dark', 'category': 'ui_ux', 'type': 'string', 'desc': 'Default visual interface skin'},
            {'key': 'MAINTENANCE_MODE', 'value': False, 'category': 'ui_ux', 'type': 'boolean', 'desc': 'Global platform maintenance lock'},
            {'key': 'SYSTEM_LOGO_URL', 'value': '', 'category': 'ui_ux', 'type': 'string', 'desc': 'Master branding logo URL'}
        ]
        
        print("\n[Sync] System Settings...")
        for data in settings:
            setting = SystemSetting.query.filter_by(key=data['key']).first()
            if not setting:
                print(f"  + Added: {data['key']}")
                setting = SystemSetting(key=data['key'], category=data['category'], value_type=data['type'], description=data['desc'])
                db.session.add(setting)
            else:
                setting.category = data['category']
                setting.value_type = data['type']
                setting.description = data['desc']
            setting.set_value(data['value'])
            
        db.session.commit()
        print("\n--- SEEDING COMPLETE: SUPERADMIN GOVERNANCE RESTORED ---")
