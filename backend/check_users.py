"""
Script to check if default users exist and create them if needed
"""
from app import create_app, db
from app.models import User
from config import Config

def check_and_create_users():
    app = create_app(Config)
    with app.app_context():
        print("=" * 60)
        print("Checking default users...")
        print("=" * 60)
        
        # Check admin
        admin = User.query.filter_by(username='admin').first()
        if admin:
            print("[OK] Admin user exists:")
            print(f"   Username: {admin.username}")
            print(f"   Email: {admin.email}")
            print(f"   Role: {admin.role}")
        else:
            print("[MISSING] Admin user not found. Creating...")
            admin = User(
                username='admin',
                email='admin@example.com',
                first_name='Admin',
                last_name='User',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            print("[OK] Admin user created!")
        
        # Check teacher
        teacher = User.query.filter_by(username='teacher').first()
        if teacher:
            print("\n[OK] Teacher user exists:")
            print(f"   Username: {teacher.username}")
            print(f"   Email: {teacher.email}")
            print(f"   Role: {teacher.role}")
        else:
            print("\n[MISSING] Teacher user not found. Creating...")
            teacher = User(
                username='teacher',
                email='teacher@example.com',
                first_name='John',
                last_name='Teacher',
                role='teacher'
            )
            teacher.set_password('teacher123')
            db.session.add(teacher)
            print("[OK] Teacher user created!")
        
        # Check student
        student = User.query.filter_by(username='student1').first()
        if student:
            print("\n[OK] Student user exists:")
            print(f"   Username: {student.username}")
            print(f"   Email: {student.email}")
            print(f"   Role: {student.role}")
        else:
            print("\n[MISSING] Student user not found. Creating...")
            student = User(
                username='student1',
                email='student1@example.com',
                first_name='Jane',
                last_name='Student',
                role='student'
            )
            student.set_password('student123')
            db.session.add(student)
            print("[OK] Student user created!")
        
        db.session.commit()
        
        print("\n" + "=" * 60)
        print("Login Credentials:")
        print("=" * 60)
        print("  Admin:   admin / admin123")
        print("  Teacher: teacher / teacher123")
        print("  Student: student1 / student123")
        print("=" * 60)

if __name__ == '__main__':
    check_and_create_users()

