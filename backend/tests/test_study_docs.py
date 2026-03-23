
import unittest
import json
from app import create_app, db
from app.models.study_documents import StudyRoomDocument
from app.models import User
from flask_jwt_extended import create_access_token

class TestStudyDocs(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            # Create dummy user
            user = User(username='teststudent', email='test@test.com')
            user.set_password('password')
            db.session.add(user)
            db.session.commit()
            self.user_id = user.id
            self.token = create_access_token(identity=user.id)
            self.headers = {'Authorization': f'Bearer {self.token}'}

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_create_document(self):
        res = self.client.post('/api/study-rooms/room123/documents', 
                               json={'title': 'My Notes', 'content': 'Hello'},
                               headers=self.headers)
        self.assertEqual(res.status_code, 201)
        self.assertIn('My Notes', res.get_json()['title'])

    def test_list_documents(self):
        self.client.post('/api/study-rooms/room123/documents', 
                               json={'title': 'Doc 1'}, headers=self.headers)
        res = self.client.get('/api/study-rooms/room123/documents', headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()), 1)

    def test_update_document(self):
        # Create
        rv = self.client.post('/api/study-rooms/room123/documents', 
                              json={'title': 'Original'}, headers=self.headers)
        doc_id = rv.get_json()['id']
        
        # Update
        res = self.client.put(f'/api/documents/{doc_id}', 
                              json={'content': 'Updated Content'}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['content'], 'Updated Content')

    def test_email_simulation(self):
        rv = self.client.post('/api/study-rooms/room123/documents', 
                              json={'title': 'Email Doc'}, headers=self.headers)
        doc_id = rv.get_json()['id']
        
        res = self.client.post(f'/api/documents/{doc_id}/email',
                               json={'recipients': ['foo@bar.com']}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()['simulated'])

if __name__ == '__main__':
    unittest.main()
