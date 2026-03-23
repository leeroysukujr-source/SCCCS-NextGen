"""Quickly inspect key tables and print counts and a few sample rows.

Usage:
  python tools/check_data.py

This script will print counts for Users, Classes, Lessons, Rooms, Channels,
Messages and DirectMessages and show up to 5 sample rows for each.
"""
from pprint import pprint
from config import Config
from app import create_app, db


def show_samples(model, limit=5):
    try:
        q = model.query.order_by(model.id.desc()).limit(limit).all()
        return [getattr(x, 'to_dict', lambda: x.__dict__)() for x in q]
    except Exception as e:
        return f'error reading samples: {e}'


def main():
    app = create_app(Config)
    with app.app_context():
        from app.models import User, Class, Lesson, Room, Channel, Message, DirectMessage

        print('Counts:')
        try:
            print('Users:', User.query.count())
            print('Classes:', Class.query.count())
            print('Lessons:', Lesson.query.count())
            print('Rooms:', Room.query.count())
            print('Channels:', Channel.query.count())
            print('Messages:', Message.query.count())
            print('DirectMessages:', DirectMessage.query.count())
        except Exception as e:
            print('Error counting tables:', e)

        print('\nSample Users:')
        pprint(show_samples(User))

        print('\nSample Classes:')
        pprint(show_samples(Class))

        print('\nSample Lessons:')
        pprint(show_samples(Lesson))

        print('\nSample Rooms:')
        pprint(show_samples(Room))

        print('\nSample Channels:')
        pprint(show_samples(Channel))

        print('\nSample Messages:')
        pprint(show_samples(Message))

        print('\nSample DirectMessages:')
        pprint(show_samples(DirectMessage))


if __name__ == '__main__':
    main()
