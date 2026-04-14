
from app import create_app, db
from app.models import GlobalFeatureFlag, SystemSetting
from app.services.settings_service import settings_service

def seed_academic_features():
    app = create_app()
    with app.app_context():
        print("--- Seeding Academic Features & Settings ---")
        
        # 1. Global Feature Flags
        features = [
            {
                'name': 'assignments_ecosystem',
                'description': 'Master toggle for the end-to-end assignment submission and grading system.',
                'is_enabled': True
            },
            {
                'name': 'rubric_analysis_ai',
                'description': 'Enable AI-powered rubric analysis and feedback generation in the grading hub.',
                'is_enabled': True
            },
            {
                'name': 'group_study_vault',
                'description': 'Enables the tactical document vault in assignment group rooms for cross-member file sharing.',
                'is_enabled': True
            }
        ]
        
        for f_data in features:
            flag = GlobalFeatureFlag.query.filter_by(name=f_data['name']).first()
            if not flag:
                flag = GlobalFeatureFlag(name=f_data['name'])
                db.session.add(flag)
            flag.description = f_data['description']
            flag.is_enabled = f_data['is_enabled']
            print(f"Feature Flag: {f_data['name']} [SET]")

        # 2. System Settings (Institutional Control)
        academic_settings = [
            {
                'key': 'ACADEMIC_MAX_GROUP_SIZE',
                'value': 5,
                'category': 'academic',
                'value_type': 'int',
                'description': 'Maximum allowed members in an assignment collaborative squad.',
                'is_overridable': True
            },
            {
                'key': 'ACADEMIC_ALLOW_INDIVIDUAL_PATH',
                'value': True,
                'category': 'academic',
                'value_type': 'bool',
                'description': 'Allow students to choose "Lone Operative" mode for assignments.',
                'is_overridable': True
            },
            {
                'key': 'ACADEMIC_ALLOWED_EXTENSIONS',
                'value': 'pdf,doc,docx,zip,txt,jpg,png',
                'category': 'academic',
                'value_type': 'string',
                'description': 'Comma-separated list of permitted file extensions for mission uploads.',
                'is_overridable': True
            },
            {
                'key': 'ACADEMIC_AUTO_NOTIFY_CHANNEL',
                'value': True,
                'category': 'academic',
                'value_type': 'bool',
                'description': 'Enable automated grade publication announcements in course channels.',
                'is_overridable': True
            },
            {
                'key': 'ACADEMIC_LATE_SUBMISSION_POLICY',
                'value': 'grace_period',
                'category': 'academic',
                'value_type': 'string',
                'description': 'Default policy for late mission reports (e.g. strict, grace_period, forbidden).',
                'is_overridable': True
            }
        ]

        for s_data in academic_settings:
            settings_service.set_system_setting(
                key=s_data['key'],
                value=s_data['value'],
                category=s_data['category'],
                value_type=s_data['value_type'],
                description=s_data['description'],
                is_overridable=s_data['is_overridable']
            )
            print(f"System Setting: {s_data['key']} [SET]")

        db.session.commit()
        print("--- Seeding Completed Successfully ---")

if __name__ == "__main__":
    seed_academic_features()
