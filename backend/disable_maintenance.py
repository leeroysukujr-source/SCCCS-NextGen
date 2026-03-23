from app import create_app, db
from app.services.settings_service import settings_service

app = create_app()

with app.app_context():
    # Disable maintenance mode
    settings_service.set_system_setting(
        'MAINTENANCE_MODE', 
        False, 
        category='general',
        value_type='boolean',
        description='Disable non-admin access and show maintenance page',
        is_public=True
    )
    print("✅ Maintenance mode disabled")
