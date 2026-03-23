from app import create_app, db
from app.models import User, Workspace, WorkspaceMembership

app = create_app()
with app.app_context():
    user_id = 4
    u = User.query.get(user_id)
    if u:
        u.role = 'admin'
        print(f"Updated User {u.id} role to admin")
        
        mems = WorkspaceMembership.query.filter_by(user_id=u.id, workspace_id=1).all()
        for m in mems:
            m.role = 'admin'
            print(f"Updated Membership in WS {m.workspace_id} role to admin")
        
        db.session.commit()
    else:
        print("User not found")
