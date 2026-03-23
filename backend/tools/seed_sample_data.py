"""Seed sample users, rooms, channels, messages and direct messages.

Usage:
  python tools/seed_sample_data.py

This script uses the app factory to get a Flask app and SQLAlchemy db
and will create a minimal set of data for local development/testing.
It is safe to re-run: it checks for existing records by username/room_code.
"""
import sys
from datetime import datetime

from config import Config

from app import create_app, db


def seed():
    app = create_app(Config)
    with app.app_context():
        from app.models import User, Room, Channel, Message, DirectMessage

        # Admin
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', email='admin@example.com', first_name='Admin', role='admin')
            admin.set_password('adminpass')
            db.session.add(admin)
            db.session.commit()
            print('Created admin user: admin / adminpass')
        else:
            print('Admin user already exists')

        # Sample users
        alice = User.query.filter_by(username='alice').first()
        if not alice:
            alice = User(username='alice', email='alice@example.com', first_name='Alice')
            alice.set_password('alicepass')
            db.session.add(alice)

        bob = User.query.filter_by(username='bob').first()
        if not bob:
            bob = User(username='bob', email='bob@example.com', first_name='Bob')
            bob.set_password('bobpass')
            db.session.add(bob)

        db.session.commit()

        # Create a room
        room = Room.query.filter_by(room_code='GENERAL-1').first()
        if not room:
            room = Room(name='General Room', description='A sample general room', host_id=admin.id, room_code='GENERAL-1')
            db.session.add(room)
            db.session.commit()
            print('Created room: General Room')
        else:
            print('Room already exists')

        # Create a channel
        channel = Channel.query.filter_by(name='general').first()
        if not channel:
            channel = Channel(name='general', description='General channel', created_by=admin.id)
            db.session.add(channel)
            db.session.commit()
            print('Created channel: general')
        else:
            print('Channel already exists')

        # Add some messages to channel
        if channel and channel.messages.count() == 0:
            m1 = Message(channel_id=channel.id, author_id=alice.id, content='Hello everyone!')
            m2 = Message(channel_id=channel.id, author_id=bob.id, content='Hi Alice, welcome!')
            db.session.add_all([m1, m2])
            db.session.commit()
            print('Inserted sample messages into channel')
        else:
            print('Channel already has messages')

        # Create a direct message between alice and bob
        dm_exists = DirectMessage.query.filter_by(sender_id=alice.id, recipient_id=bob.id).first()
        if not dm_exists:
            dm = DirectMessage(sender_id=alice.id, recipient_id=bob.id, content='Hey Bob, want to grab coffee?')
            db.session.add(dm)
            db.session.commit()
            print('Created a direct message from Alice to Bob')
        else:
            print('Direct message already exists')

        print('Seeding complete')


if __name__ == '__main__':
    try:
        seed()
    except Exception as e:
        print('Error seeding sample data:', e)
        sys.exit(1)
