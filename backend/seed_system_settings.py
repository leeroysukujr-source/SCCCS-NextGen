
from app import create_app, db
from app.models.system_settings import SystemSetting

def seed_settings():
    app = create_app()
    with app.app_context():
        # Robust check for table existence
        try:
            # Try to query to see if table exists
            SystemSetting.query.first()
        except Exception:
            print("Table missing, creating...")
            try:
                SystemSetting.__table__.create(db.engine)
            except Exception as e:
                print(f"Creation warning: {e}")
        
        defaults = [
            # Identity
            {'key': 'APP_NAME', 'value': 'SCCCS', 'category': 'identity', 'description': 'Application Name'},
            {'key': 'SYSTEM_LOGO_URL', 'value': '', 'category': 'identity', 'description': 'URL of the system logo'},
            
            # Security
            {'key': 'ALLOW_PUBLIC_REGISTRATION', 'value': False, 'value_type': 'boolean', 'category': 'security', 'description': 'Allow users to sign up without invite'},
            {'key': 'REQUIRE_2FA_ADMIN', 'value': True, 'value_type': 'boolean', 'category': 'security', 'description': 'Force 2FA for all admins'},
            
            # Modules
            {'key': 'ENABLE_VIDEO_ROOM', 'value': True, 'value_type': 'boolean', 'category': 'modules', 'description': 'Enable Video Room feature'},
            {'key': 'ENABLE_STUDY_ROOM', 'value': True, 'value_type': 'boolean', 'category': 'modules', 'description': 'Enable Study Room feature'},
            
            # UX
            {'key': 'DEFAULT_THEME', 'value': 'light', 'category': 'ux', 'description': 'Default system theme'},
            {'key': 'SHOW_ONBOARDING', 'value': True, 'value_type': 'boolean', 'category': 'ux', 'description': 'Show onboarding for new users'}
        ]
        
        print("Seeding System Settings...")
        for data in defaults:
            setting = SystemSetting.query.filter_by(key=data['key']).first()
            if not setting:
                setting = SystemSetting(key=data['key'])
                db.session.add(setting)
                print(f"Created: {data['key']}")
            
            # Update fields
            setting.category = data.get('category', 'general')
            setting.value_type = data.get('value_type', 'string')
            setting.description = data.get('description', '')
            setting.set_value(data['value'])
            
        db.session.commit()
        print("System Settings seeded.")

if __name__ == '__main__':
    seed_settings()
