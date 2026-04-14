from app import create_app, db
from app.models import GlobalFeatureFlag, WorkspaceFeatureOverride

app = create_app()
with app.app_context():
    global_flags = GlobalFeatureFlag.query.filter_by(name='video_room').all()
    if not global_flags:
        print("GLOBAL: video_room NOT FOUND")
    for f in global_flags:
        print(f"GLOBAL: {f.name} = {f.is_enabled}")
        
    overrides = WorkspaceFeatureOverride.query.filter_by(feature_name='video_room').all()
    for o in overrides:
        print(f"OVERRIDE: Workspace {o.workspace_id} {o.feature_name} = {o.is_enabled}")
