from app import create_app, db
from app.models import User, Room, Channel, Class, ClassMember, ChannelMember, RoomParticipant
from config import Config
import secrets
import string

def generate_code(length=6):
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))

def init_database():
    app = create_app(Config)
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create sample admin user
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@example.com',
                first_name='Admin',
                last_name='User',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.flush()
        
        # Create sample teacher
        teacher = User.query.filter_by(username='teacher').first()
        if not teacher:
            teacher = User(
                username='teacher',
                email='teacher@example.com',
                first_name='John',
                last_name='Teacher',
                role='teacher'
            )
            teacher.set_password('teacher123')
            db.session.add(teacher)
            db.session.flush()
        
        # Create sample student
        student = User.query.filter_by(username='student1').first()
        if not student:
            student = User(
                username='student1',
                email='student1@example.com',
                first_name='Jane',
                last_name='Student',
                role='student'
            )
            student.set_password('student123')
            db.session.add(student)
            db.session.flush()
        
        db.session.commit()
        
        # Create sample room
        if not Room.query.first():
            room_code = generate_code(8)
            room = Room(
                name='Sample Meeting Room',
                description='Welcome to your first meeting room',
                host_id=admin.id,
                room_code=room_code,
                max_participants=50
            )
            db.session.add(room)
            db.session.flush()
            
            # Add admin as participant
            participant = RoomParticipant(room_id=room.id, user_id=admin.id)
            db.session.add(participant)
        
        # Create sample channel
        if not Channel.query.first():
            channel = Channel(
                name='general',
                description='General discussion channel',
                type='public',
                created_by=admin.id
            )
            db.session.add(channel)
            db.session.flush()
            
            # Add users as members
            for user in [admin, teacher, student]:
                member = ChannelMember(channel_id=channel.id, user_id=user.id)
                db.session.add(member)
        
        # Create sample class
        if not Class.query.first():
            class_code = generate_code(6)
            class_obj = Class(
                name='Introduction to Computer Science',
                description='An introductory course covering programming fundamentals',
                code=class_code,
                teacher_id=teacher.id
            )
            db.session.add(class_obj)
            db.session.flush()
            
            # Add teacher and student as members
            teacher_member = ClassMember(class_id=class_obj.id, user_id=teacher.id, role='teacher')
            student_member = ClassMember(class_id=class_obj.id, user_id=student.id, role='student')
            db.session.add(teacher_member)
            db.session.add(student_member)
        
        db.session.commit()
        
        print("=" * 60)
        print("Database initialized with sample data:")
        print("=" * 60)
        print("\nDefault Users:")
        print("  Admin:   admin / admin123")
        print("  Teacher: teacher / teacher123")
        print("  Student: student1 / student123")
        print("\nSample data created:")
        print("  - 1 Meeting Room (sample room)")
        print("  - 1 Channel (general)")
        print("  - 1 Class (Introduction to Computer Science)")
        print("=" * 60)

if __name__ == '__main__':
    init_database()

