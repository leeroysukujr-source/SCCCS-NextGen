from app import create_app, db
from app.models import User, Channel, Room, Class, Message, DirectMessage, Feedback, ChannelMember, Workspace
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
        print(f"\n[INFO] Users: {len(users)}")
        if users:
            for user in users:
                print(f"   - {user.username} ({user.email}) | Role: {user.role}")
        
        # Check Workspaces
        workspaces = Workspace.query.all()
        print(f"\n[INFO] Workspaces: {len(workspaces)}")
        if workspaces:
            for ws in workspaces:
                print(f"   - {ws.name} (Slug: {ws.slug}) | ID: {ws.id}")
        
        # Check Channels
        channels = Channel.query.all()
        print(f"\n[INFO] Channels: {len(channels)}")
        if channels:
            for channel in channels:
                print(f"   - {channel.name} (created by user {channel.created_by})")
        
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total Users: {len(users)}")
        print(f"Total Workspaces: {len(workspaces)}")
        print(f"Total Channels: {len(channels)}")
        
        if len(workspaces) == 0:
            print("\n[WARNING] No workspaces found in database!")
        
        print("\n" + "=" * 60)

if __name__ == '__main__':
    check_database()

