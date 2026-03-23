from app import create_app, db
from app.models import Channel, User, Assignment, AssignmentGroup, ChannelMember
from sqlalchemy import func
import traceback

app = create_app()
with app.app_context():
    try:
        user = User.query.filter(User.workspace_id.isnot(None), User.role != 'student').first()
        if not user:
             user = User.query.first()
        
        print(f"User: {user.id}, Workspace: {user.workspace_id}")
        
        # Create temp data
        import time
        t = int(time.time())
        ch = Channel(name=f'Test_{t}', type='course', created_by=user.id, workspace_id=user.workspace_id)
        db.session.add(ch)
        db.session.commit()
        
        asg = Assignment(title='T', created_by=user.id, channel_id=ch.id, status='published', workspace_id=user.workspace_id)
        db.session.add(asg)
        db.session.commit()
        
        ws_id = user.workspace_id if user.workspace_id else 1
        ag = AssignmentGroup(name='G', assignment_id=asg.id, workspace_id=ws_id)
        db.session.add(ag)
        db.session.commit()
        
        print(f"User: {user.id}, Workspace: {user.workspace_id}")
        
        # Query Courses
        print("Querying channels...")
        courses = Channel.query.filter_by(
            type='course',
            created_by=user.id,
            workspace_id=user.workspace_id
        ).order_by(Channel.created_at.desc()).all()
        print(f"Found {len(courses)} courses")
        
        for c in courses:
            print(f"Processing course {c.id}")
            
            # Stats
            student_count = ChannelMember.query.filter(
                ChannelMember.channel_id == c.id,
                ChannelMember.role != 'admin',
                ChannelMember.role != 'owner'
            ).count()
            print(f"Students: {student_count}")
            
            assignment_count = Assignment.query.filter_by(channel_id=c.id).count()
            print(f"Assignments: {assignment_count}")
            
            group_count = db.session.query(func.count(AssignmentGroup.id)).join(Assignment, AssignmentGroup.assignment_id == Assignment.id).filter(Assignment.channel_id == c.id).scalar()
            print(f"Groups: {group_count}")
            
            # to_dict
            start = c.to_dict()
            print("to_dict success")

    except Exception as e:
        print("ERROR:")
        traceback.print_exc()
