from app import create_app, db
from config import Config
from app.models import User, DeviceSession
import json

app = create_app(Config)

with app.app_context():
    print('Creating database tables (if not present)')
    db.create_all()
    # Ensure no pending DB session state from app startup (prevent IntegrityError during tests)
    try:
        db.session.rollback()
    except Exception:
        pass

    # Remove any existing test users to keep idempotent
    existing = User.query.filter_by(username='testuser').first()
    if existing:
        # Remove any device sessions tied to this user to avoid FK/NOT NULL conflicts
        try:
            DeviceSession.query.filter_by(user_id=existing.id).delete()
            db.session.commit()
        except Exception:
            db.session.rollback()
        db.session.delete(existing)
        db.session.commit()

    user = User(username='testuser', email='test@example.com', first_name='Test', last_name='User', role='student')
    user.set_password('Testpass1')
    db.session.add(user)
    db.session.commit()

    client = app.test_client()

    # Test login by username
    payload = {'username': 'testuser', 'password': 'Testpass1'}
    resp = client.post('/api/auth/login', data=json.dumps(payload), content_type='application/json')
    print('\nLogin by username status:', resp.status_code)
    print('Response:', resp.get_json())

    # Test login by email
    payload = {'username': 'test@example.com', 'password': 'Testpass1'}
    resp = client.post('/api/auth/login', data=json.dumps(payload), content_type='application/json')
    print('\nLogin by email status:', resp.status_code)
    print('Response:', resp.get_json())

    # Test wrong password
    payload = {'username': 'testuser', 'password': 'wrongpass'}
    resp = client.post('/api/auth/login', data=json.dumps(payload), content_type='application/json')
    print('\nLogin wrong password status:', resp.status_code)
    print('Response:', resp.get_json())

    # Cleanup
    u = User.query.filter_by(username='testuser').first()
    if u:
        try:
            DeviceSession.query.filter_by(user_id=u.id).delete()
            db.session.commit()
        except Exception:
            db.session.rollback()
        db.session.delete(u)
        db.session.commit()

    print('\nTest script finished')
