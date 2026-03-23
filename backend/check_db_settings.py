
from app import create_app, db
from app.models import SystemSetting

app = create_app()

with app.app_context():
    count = SystemSetting.query.count()
    print(f"Total System Settings: {count}")
    
    if count == 0:
        print("Settings table is EMPTY. Need to seed.")
    else:
        settings = SystemSetting.query.all()
        for s in settings:
            print(f"- {s.key}: {s.get_value()} (Cat: {s.category}, Public: {s.is_public})")
