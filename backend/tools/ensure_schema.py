"""Ensure DB schema has recent columns required by models.

This script detects missing columns on the `users` table and adds them
using simple ALTER TABLE statements suitable for SQLite and Postgres.
Run before seeding when migrations are not available.
"""
from config import Config
from app import create_app, db
from sqlalchemy import inspect, text


def ensure():
    app = create_app(Config)
    with app.app_context():
        inspector = inspect(db.engine)
        cols = [c['name'] for c in inspector.get_columns('users')]
        dialect = db.engine.dialect.name

        to_add = []
        if 'two_factor_enabled' not in cols:
            to_add.append(('two_factor_enabled', 'boolean'))
        if 'totp_secret' not in cols:
            to_add.append(('totp_secret', 'string'))
        if 'totp_encrypted' not in cols:
            to_add.append(('totp_encrypted', 'boolean'))

        if not to_add:
            print('No schema fixes needed')
            return

        for name, typ in to_add:
            try:
                if dialect == 'sqlite':
                    if typ == 'boolean':
                        sql = text(f"ALTER TABLE users ADD COLUMN {name} INTEGER NOT NULL DEFAULT 0")
                    else:
                        sql = text(f"ALTER TABLE users ADD COLUMN {name} TEXT")
                else:
                    # Postgres and others
                    if typ == 'boolean':
                        sql = text(f"ALTER TABLE users ADD COLUMN {name} boolean NOT NULL DEFAULT false")
                    else:
                        sql = text(f"ALTER TABLE users ADD COLUMN {name} text")
                db.session.execute(sql)
                db.session.commit()
                print(f'Added column {name}')
            except Exception as e:
                print(f'Failed to add column {name}:', e)


if __name__ == '__main__':
    ensure()
