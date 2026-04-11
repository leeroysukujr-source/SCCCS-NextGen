
from app import create_app, db
from app.models.system_settings import SystemSetting

def seed_settings():
    app = create_app()
    with app.app_context():
        # Ensure table exists — rollback any failed DDL transaction before querying
        try:
            SystemSetting.query.first()
        except Exception:
            db.session.rollback()  # Clear aborted transaction state
            print("Table missing, creating...")
            try:
                SystemSetting.__table__.create(db.engine)
            except Exception as e:
                print(f"Creation warning: {e}")
                db.session.rollback()  # Rollback duplicate index error too

        # Now safe to query
        try:
            defaults = [
                {'key': 'APP_NAME', 'value': 'SCCCS', 'category': 'general', 'description': 'Application Name'},
                {'key': 'SYSTEM_LOGO_URL', 'value': '', 'category': 'ui_ux', 'description': 'URL of the system logo'},
                {'key': 'ALLOW_PUBLIC_REGISTRATION', 'value': False, 'value_type': 'boolean', 'category': 'security', 'description': 'Allow users to sign up without invite'},
                {'key': 'REQUIRE_2FA_ADMIN', 'value': True, 'value_type': 'boolean', 'category': 'security', 'description': 'Force 2FA for all admins'},
                {'key': 'ENABLE_VIDEO_ROOM', 'value': True, 'value_type': 'boolean', 'category': 'communication', 'description': 'Enable Video Room feature'},
                {'key': 'ENABLE_STUDY_ROOM', 'value': True, 'value_type': 'boolean', 'category': 'communication', 'description': 'Enable Study Room feature'},
                {'key': 'DEFAULT_THEME', 'value': 'light', 'category': 'ui_ux', 'description': 'Default system theme'},
                {'key': 'SHOW_ONBOARDING', 'value': True, 'value_type': 'boolean', 'category': 'ui_ux', 'description': 'Show onboarding for new users'}
            ]

            print("Seeding System Settings...")
            for data in defaults:
                setting = SystemSetting.query.filter_by(key=data['key']).first()
                if not setting:
                    setting = SystemSetting(key=data['key'])
                    db.session.add(setting)
                    print(f"Created: {data['key']}")
                else:
                    print(f"Setting {data['key']} already exists.")

                setting.category = data.get('category', 'general')
                setting.value_type = data.get('value_type', 'string')
                setting.description = data.get('description', '')
                setting.set_value(data['value'])

            db.session.commit()
            print("System Settings seeded successfully.")
        except Exception as e:
            db.session.rollback()
            print(f"Seeding failed: {e}")

if __name__ == '__main__':
    seed_settings()
