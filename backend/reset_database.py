"""
Script to completely reset the database with correct schema
"""
from app import create_app, db
from app.models import Room, RoomParticipant, User, Class, ClassMember, Lesson, LessonLink, Channel, ChannelMember, Message, Notification, File, Group, GroupMember, GroupJoinRequest
from config import Config
import os

def reset_database():
    app = create_app(Config)
    
    with app.app_context():
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        db_path = db_uri.replace('sqlite:///', '')
        
        # Remove existing database file
        if os.path.exists(db_path):
            print(f"Removing existing database file: {db_path}")
            os.remove(db_path)
        
        # Create all tables
        print("Creating all tables with correct schema...")
        db.create_all()
        
        # Verify Room table
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('rooms')]
        print(f"\n✓ Rooms table created with columns: {columns}")
        print(f"✓ Has started_at: {'started_at' in columns}")
        print(f"✓ Has ended_at: {'ended_at' in columns}")
        
        # Verify model columns match
        model_cols = [c.name for c in Room.__table__.columns]
        print(f"\nModel expects columns: {model_cols}")
        
        if set(columns) == set(model_cols):
            print("✓ Database schema matches model!")
        else:
            print("⚠️  Schema mismatch!")
            print(f"  Missing: {set(model_cols) - set(columns)}")
            print(f"  Extra: {set(columns) - set(model_cols)}")

if __name__ == '__main__':
    reset_database()

