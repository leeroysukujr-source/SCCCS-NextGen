
from app import create_app, db
from app.models import GlobalFeatureFlag
from app.models.system_settings import SystemSetting
import json

def run_all_seeders(app=None):
    if app is None:
        app = create_app()
    with app.app_context():
        print("--- RUNNING AUTOMATED SEEDING ENGINE ---")
        
        # 1. GLOBAL FEATURE FLAGS (High-level module toggles)
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
            ('search', 'Global architectural search engine', True),
            
            # New Premium Hardened Modules
            ('security_nexus', 'Advanced security suite including 2FA, session management, and brute-force protection.', True),
            ('collaboration_engine', 'Real-time multi-user document editing powered by Yjs and WebSockets.', True),
            ('enhanced_connectivity', 'Standardized video conferencing, interactive whiteboards, and breakout rooms.', True),
            ('ai_tutoring_system', 'AI-powered study assistance and rubric analysis.', True),
            ('group_study_vault', 'Encrypted document storage for study groups with version history.', True),
            ('whiteboard', 'Interactive canvas and creative whiteboard ecosystem.', True),
            ('assignments_ecosystem', 'NextGen assignment workflow with anonymous grading support.', True),
            ('rubric_analysis_ai', 'AI-driven rubric generation and synthesized feedback.', True)
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
        
        # 2. SYSTEM SETTINGS (Granular key-value parameters)
        settings = [
            {'key': 'SYSTEM_NAME', 'value': 'SCCCS NextGen', 'category': 'general', 'type': 'string', 'desc': 'Primary platform branding name', 'overridable': False},
            {'key': 'SYSTEM_EMAIL', 'value': 'noreply@scccs.edu', 'category': 'general', 'type': 'string', 'desc': 'Outbound system notice address', 'overridable': False},
            {'key': 'SUPPORT_EMAIL', 'value': 'support@scccs.edu', 'category': 'general', 'type': 'string', 'desc': 'Official support contact email', 'overridable': False},
            {'key': 'MAX_LOGIN_ATTEMPTS', 'value': 5, 'category': 'security', 'type': 'number', 'desc': 'Brute-force protection threshold', 'overridable': False},
            {'key': 'TOKEN_EXPIRATION', 'value': 86400, 'category': 'security', 'type': 'number', 'desc': 'JWT token lifetime in seconds', 'overridable': False},
            {'key': 'ENFORCE_2FA', 'value': False, 'category': 'security', 'type': 'bool', 'desc': 'Mandate Two-Factor Authentication system-wide', 'overridable': True},
            {'key': 'SESSION_TIMEOUT_MIN', 'value': 60, 'category': 'security', 'type': 'number', 'desc': 'Minutes of inactivity before auto-logout', 'overridable': True},
            {'key': 'LIVEKIT_URL', 'value': '', 'category': 'communication', 'type': 'string', 'desc': 'LiveKit server endpoint for conferencing', 'overridable': False},
            {'key': 'WSS_ENABLED', 'value': True, 'category': 'communication', 'type': 'bool', 'desc': 'Enable Secure WebSockets (WSS)', 'overridable': False},
            {'key': 'THEME_DEFAULT', 'value': 'dark', 'category': 'ui_ux', 'type': 'string', 'desc': 'Default visual interface skin', 'overridable': True},
            {'key': 'SYSTEM_LOGO_URL', 'value': '/static/logo.png', 'category': 'ui_ux', 'type': 'string', 'desc': 'Master branding logo URL', 'overridable': True},
            {'key': 'PRIMARY_COLOR', 'value': '#3b82f6', 'category': 'ui_ux', 'type': 'string', 'desc': 'Brand primary color (Hex)', 'overridable': True}
        ]
        
        print("\n[Sync] System Settings...")
        for data in settings:
            setting = SystemSetting.query.filter_by(key=data['key']).first()
            if not setting:
                print(f"  + Added: {data['key']}")
                setting = SystemSetting(
                    key=data['key'], 
                    category=data['category'], 
                    value_type=data['type'], 
                    description=data['desc'],
                    is_overridable=data.get('overridable', False)
                )
                db.session.add(setting)
            else:
                setting.category = data['category']
                setting.value_type = data['type']
                setting.description = data['desc']
                setting.is_overridable = data.get('overridable', setting.is_overridable)
            
            setting.set_value(data['value'])
            
        db.session.commit()
        print("\n--- SEEDING COMPLETE: SUPERADMIN GOVERNANCE RESTORED ---")
