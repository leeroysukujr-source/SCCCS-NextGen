from app import create_app, db
from app.models import Permission, Role, User, Workspace

app = create_app()

def seed_rbac():
    print("Starting RBAC Seeding...")
    with app.app_context():
        # 1. Create Default Permissions
        permissions_list = [
            {'name': 'manage_workspace', 'desc': 'Manage workspace settings and billing'},
            {'name': 'manage_users', 'desc': 'Add, remove, and manage users in workspace'},
            {'name': 'manage_classes', 'desc': 'Create, edit, and delete classes'},
            {'name': 'view_classes', 'desc': 'View class list'},
            {'name': 'view_content', 'desc': 'View educational content'},
            {'name': 'create_content', 'desc': 'Create/Edit educational content'},
            {'name': 'grade_assignments', 'desc': 'Grade student submissions'},
            {'name': 'submit_assignments', 'desc': 'Submit assignments'},
            {'name': 'publish_channel', 'desc': 'Publish draft courses to the campus'},
            {'name': 'manage_assignments', 'desc': 'Full control over academic assignments'}
        ]
        
        perms = {}
        for p in permissions_list:
            perm = Permission.query.filter_by(name=p['name']).first()
            if not perm:
                perm = Permission(name=p['name'], description=p['desc'])
                db.session.add(perm)
                print(f"Created Permission: {p['name']}")
            perms[p['name']] = perm
        
        db.session.commit()
        
        # 2. Iterate Workspaces and Create Roles
        workspaces = Workspace.query.all()
        for ws in workspaces:
            print(f"Checking roles for Workspace: {ws.name} ({ws.code})")
            
            # Workspace Admin
            admin_role = Role.query.filter_by(workspace_id=ws.id, name='Workspace Admin').first()
            if not admin_role:
                admin_role = Role(name='Workspace Admin', workspace_id=ws.id, description='Full Control')
                admin_role.permissions = [
                    perms['manage_workspace'], perms['manage_users'], perms['manage_classes'], 
                    perms['view_classes'], perms['view_content'], perms['create_content'],
                    perms['publish_channel'], perms['manage_assignments']
                ]
                db.session.add(admin_role)
            
            # Lecturer
            lecturer_role = Role.query.filter_by(workspace_id=ws.id, name='Lecturer').first()
            if not lecturer_role:
                lecturer_role = Role(name='Lecturer', workspace_id=ws.id, description='Content Creator')
                lecturer_role.permissions = [
                    perms['manage_classes'], perms['view_classes'], perms['view_content'], 
                    perms['create_content'], perms['grade_assignments'],
                    perms['publish_channel'], perms['manage_assignments']
                ]
                db.session.add(lecturer_role)
            
            # Student
            student_role = Role.query.filter_by(workspace_id=ws.id, name='Student').first()
            if not student_role:
                student_role = Role(name='Student', workspace_id=ws.id, description='Learner')
                student_role.permissions = [
                    perms['view_content'], perms['view_classes'], perms['submit_assignments']
                ]
                db.session.add(student_role)
            
            db.session.commit()
            
            # 3. Migrate Users (Assign Roles)
            users = User.query.filter_by(workspace_id=ws.id).all()
            for user in users:
                if user.role == 'super_admin':
                    continue
                
                # Check if user already has roles
                if not user.roles:
                    target_role = None
                    if user.role == 'admin':
                        target_role = admin_role
                    elif user.role == 'teacher':
                        target_role = lecturer_role
                    else:
                        target_role = student_role
                        
                    user.roles.append(target_role)
                    print(f"  -> Assigned '{target_role.name}' to {user.username}")
            
            db.session.commit()
            
    print("RBAC Seeding & Migration Completed.")

if __name__ == "__main__":
    seed_rbac()
