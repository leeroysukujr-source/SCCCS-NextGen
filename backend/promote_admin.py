from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    email = 'globalimpactinnovators26@gmail.com'
    print(f"Finding {email}...")
    u = User.query.filter_by(email=email).first()
    
    if not u:
        print("User not found in Postgres. Creating fresh Super Admin identity...")
        u = User(
            username='global_admin', 
            email=email, 
            first_name='Global', 
            last_name='Innovator', 
            role='super_admin', 
            platform_role='SUPER_ADMIN', 
            status='active', 
            oauth_provider='firebase',
            oauth_id='tempid_will_sync_on_login'  # Firebase overwrites this on their next backend login request
        )
        db.session.add(u)
    else:
        print(f"Found {u.email}. Escalating privileges to Platform Super Admin...")
        u.role = 'super_admin'
        u.platform_role = 'SUPER_ADMIN'
        u.status = 'active'
        
    db.session.commit()
    print("Database transaction successfully committed! User is now the apex platform authority.")
