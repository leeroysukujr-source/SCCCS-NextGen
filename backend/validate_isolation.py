import json
from app import create_app, db
from app.models import User, Workspace, File, Announcement, Channel, Role, WorkspaceDomain
from flask_jwt_extended import create_access_token

app = create_app()

def validate_isolation():
    print("🚀 Starting Phase 8: Tenant Isolation Audit...")
    
    with app.app_context():
        # 1. Setup - Ensure 2 Workspaces
        ws_a = Workspace.query.filter_by(slug='univ-a').first()
        if not ws_a:
            ws_a = Workspace(name='University A', slug='univ-a', code='UNIV-A')
            db.session.add(ws_a)
            
        ws_b = Workspace.query.filter_by(slug='univ-b').first()
        if not ws_b:
            ws_b = Workspace(name='University B', slug='univ-b', code='UNIV-B')
            db.session.add(ws_b)
            
        db.session.commit()
        
        # 2. Setup - Ensure Users
        admin_a = User.query.filter_by(email='admin@univ-a.com').first()
        if not admin_a:
            admin_a = User(username='admin_a', email='admin@univ-a.com', workspace_id=ws_a.id, role='admin')
            admin_a.set_password('password')
            db.session.add(admin_a)
            
        user_b = User.query.filter_by(email='student@univ-b.com').first()
        if not user_b:
            user_b = User(username='student_b', email='student@univ-b.com', workspace_id=ws_b.id, role='student')
            user_b.set_password('password')
            db.session.add(user_b)
            
        db.session.commit()
        
        # Assign RBAC roles if missing (Phase 6 enforcement)
        if not admin_a.roles:
            role_a = Role.query.filter_by(workspace_id=ws_a.id, name='Workspace Admin').first()
            if role_a: admin_a.roles.append(role_a)
            
        if not user_b.roles:
            role_b = Role.query.filter_by(workspace_id=ws_b.id, name='Student').first()
            if role_b: user_b.roles.append(role_b)
            
        db.session.commit()

        print(f"✅ Setup: Workspace A ({ws_a.id}) & B ({ws_b.id}) ready.")

        # 3. Create Resources in A
        print("\n[Step 1] Creating Resources in Workspace A...")
        
        # Announcement
        ann_a = Announcement(workspace_id=ws_a.id, author_id=admin_a.id, title='Secret A', content='Only for A')
        db.session.add(ann_a)
        
        # Channel
        chan_a = Channel(workspace_id=ws_a.id, created_by=admin_a.id, name='Secrets-A', type='private')
        db.session.add(chan_a)
        
        db.session.commit()
        print(f" - Created Announcement: {ann_a.title} (ID: {ann_a.id})")
        print(f" - Created Channel: {chan_a.name} (ID: {chan_a.id})")

        # 4. Attempt Access from B (Simulating API)
        client = app.test_client()
        token_b = create_access_token(identity=user_b.id)
        headers_b = {'Authorization': f'Bearer {token_b}'}
        
        print("\n[Step 2] User B (Workspace B) attempting to view A's resources...")
        
        # Test Announcements
        resp = client.get('/api/announcements/', headers=headers_b)
        if resp.status_code == 200:
            data = resp.json
            found = any(a['id'] == ann_a.id for a in data)
            if found:
                print("❌ LEAKAGE DETECTED: User B can see Announcement A!")
            else:
                print("✅ PASSED: Announcement A hidden from User B.")
                
        # Test Channels
        resp = client.get('/api/channels/', headers=headers_b)
        if resp.status_code == 200:
            data = resp.json
            # Assuming channel list returns list of dicts
            found = any(c['id'] == chan_a.id for c in data)
            if found:
                 print("❌ LEAKAGE DETECTED: User B can see Channel A!")
            else:
                 print("✅ PASSED: Channel A hidden from User B.")
                 
        # Test Direct Access (if ID guessing)
        # Assuming delete endpoint checks scope
        resp = client.delete(f'/api/announcements/{ann_a.id}', headers=headers_b)
        if resp.status_code == 403 or resp.status_code == 404:
            print(f"✅ PASSED: Direct DELETE blocked ({resp.status_code}).")
        else:
            print(f"❌ FAILED: Direct DELETE allowed! ({resp.status_code})")

    print("\n🏁 Security Audit Finished.")

if __name__ == "__main__":
    validate_isolation()
