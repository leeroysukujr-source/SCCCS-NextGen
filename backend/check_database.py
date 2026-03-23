"""
Script to check if database data exists and is being loaded properly
Run this to verify your database has data and queries are working
"""
from app import create_app, db
from app.models import User, Channel, Room, Class, Message, DirectMessage, Feedback, ChannelMember
from config import Config

def check_database():
    """Check database contents"""
    app = create_app(Config)
    
    with app.app_context():
        print("=" * 60)
        print("DATABASE CHECK - Verifying Data Exists")
        print("=" * 60)
        
        # Check Users
        users = User.query.all()
        print(f"\n✅ Users: {len(users)}")
        if users:
            for user in users[:5]:  # Show first 5
                print(f"   - {user.username} ({user.role})")
        
        # Check Channels
        channels = Channel.query.all()
        print(f"\n✅ Channels: {len(channels)}")
        if channels:
            for channel in channels[:5]:
                print(f"   - {channel.name} (created by user {channel.created_by})")
        
        # Check Channel Members
        members = ChannelMember.query.all()
        print(f"\n✅ Channel Members: {len(members)}")
        if members:
            for member in members[:5]:
                print(f"   - User {member.user_id} in channel {member.channel_id}")
        
        # Check Messages
        messages = Message.query.all()
        print(f"\n✅ Messages: {len(messages)}")
        if messages:
            for msg in messages[:5]:
                print(f"   - Message {msg.id} in channel {msg.channel_id}")
        
        # Check Rooms
        rooms = Room.query.all()
        print(f"\n✅ Rooms: {len(rooms)}")
        if rooms:
            for room in rooms[:5]:
                print(f"   - {room.name} (code: {room.room_code})")
        
        # Check Classes
        classes = Class.query.all()
        print(f"\n✅ Classes: {len(classes)}")
        if classes:
            for cls in classes[:5]:
                print(f"   - {cls.name} (code: {cls.code})")
        
        # Check Direct Messages (new tables)
        try:
            direct_messages = DirectMessage.query.all()
            print(f"\n✅ Direct Messages: {len(direct_messages)}")
            if direct_messages:
                for dm in direct_messages[:5]:
                    print(f"   - Message {dm.id} from {dm.sender_id} to {dm.recipient_id}")
        except Exception as e:
            print(f"\n⚠️  Direct Messages table doesn't exist yet: {e}")
            print("   Run: python migrate_new_tables.py")
        
        # Check Feedback (new tables)
        try:
            feedbacks = Feedback.query.all()
            print(f"\n✅ Feedbacks: {len(feedbacks)}")
            if feedbacks:
                for fb in feedbacks[:5]:
                    print(f"   - Feedback {fb.id}: {fb.subject} (from student {fb.student_id} to lecturer {fb.lecturer_id})")
        except Exception as e:
            print(f"\n⚠️  Feedbacks table doesn't exist yet: {e}")
            print("   Run: python migrate_new_tables.py")
        
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total Users: {len(users)}")
        print(f"Total Channels: {len(channels)}")
        print(f"Total Messages: {len(messages)}")
        print(f"Total Rooms: {len(rooms)}")
        print(f"Total Classes: {len(classes)}")
        
        if len(users) == 0:
            print("\n⚠️  WARNING: No users found in database!")
            print("   Run: python init_db.py to create default users")
        
        if len(channels) == 0:
            print("\n⚠️  WARNING: No channels found!")
            print("   Create channels through the UI or API")
        
        print("\n" + "=" * 60)

if __name__ == '__main__':
    check_database()

