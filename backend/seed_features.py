import os
import sys
import json

# Add backend to path
sys.path.append(os.getcwd())

from app import create_app, db
from app.models import GlobalFeatureFlag

app = create_app()
with app.app_context():
    print("--- Seeding GlobalFeatureFlag ---")
    # Define standard features
    standard_features = [
        ('channels', 'Channel communications system', True),
        ('messages', 'Advanced messaging features', True),
        ('video_room', 'Video conferencing and rooms', True),
        ('study_hub', 'AI Study Hub and documents', True),
        ('classes', 'Classroom management', True),
        ('search', 'Global search engine', True)
    ]
    
    for name, desc, enabled in standard_features:
        flag = GlobalFeatureFlag.query.filter_by(name=name).first()
        if not flag:
            print(f"Creating flag: {name}")
            flag = GlobalFeatureFlag(
                name=name,
                description=desc,
                is_enabled=enabled,
                config=json.dumps({})
            )
            db.session.add(flag)
        else:
            print(f"Flag {name} already exists.")
            
    db.session.commit()
    print("Seeding complete.")
