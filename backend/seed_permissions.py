
from app import create_app, db
from app.models import Role, Permission, role_permissions

def seed_permissions():
    """Seed initial permissions and roles for the Super Admin system."""
    app = create_app()
    with app.app_context():
        print("Seeding permissions...")
        
        # 1. Define Permissions
        perms_data = [
            {'name': 'manage_admins', 'description': 'Create, modify, and delete admin accounts'},
            {'name': 'manage_settings', 'description': 'Modify system-wide settings'},
            {'name': 'view_analytics', 'description': 'View system performance and usage analytics'},
            {'name': 'manage_users', 'description': 'Manage standard user accounts'},
            {'name': 'view_audit_logs', 'description': 'View security and action audit logs'},
            {'name': 'override_restrictions', 'description': 'Bypass standard restrictions (Super Admin only)'}
        ]

        created_perms = {}
        for p_data in perms_data:
            perm = Permission.query.filter_by(name=p_data['name']).first()
            if not perm:
                perm = Permission(name=p_data['name'], description=p_data['description'])
                db.session.add(perm)
                print(f"Created permission: {p_data['name']}")
            else:
                perm.description = p_data['description']
                print(f"Updated permission: {p_data['name']}")
            created_perms[p_data['name']] = perm
        
        db.session.commit()

        # 2. Define Standard Global Roles
        roles_data = [
            {
                'name': 'Settings Manager', 
                'description': 'Can manage system settings but not users.',
                'perms': ['manage_settings', 'view_analytics']
            },
            {
                'name': 'User Manager', 
                'description': 'Can manage users and admins but not settings.',
                'perms': ['manage_users', 'manage_admins', 'view_audit_logs']
            },
            {
                'name': 'System Viewer',
                'description': 'Read-only access to system configuration.',
                'perms': ['view_analytics', 'view_audit_logs']
            }
        ]

        for r_data in roles_data:
            role = Role.query.filter_by(name=r_data['name'], workspace_id=None).first()
            if not role:
                role = Role(name=r_data['name'], description=r_data['description'], workspace_id=None)
                db.session.add(role)
                print(f"Created role: {r_data['name']}")
            else:
                print(f"Updated role: {r_data['name']}")
            
            # Assign permissions
            # Clear existing perms to ensure state matches seed
            role.permissions = [] 
            for p_name in r_data['perms']:
                if p_name in created_perms:
                    role.permissions.append(created_perms[p_name])
            
        db.session.commit()
        print("Permissions and Roles seeded successfully.")

if __name__ == '__main__':
    seed_permissions()
