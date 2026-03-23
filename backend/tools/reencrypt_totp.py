"""
Utility to re-encrypt existing totp_secret values when rotating keys.

Usage:
  Set environment variables OLD_TOTP_ENC_KEY and NEW_TOTP_ENC_KEY, then run:
    python tools/reencrypt_totp.py

This script will iterate users with non-null totp_secret, attempt to decrypt with OLD key
and re-encrypt with NEW key. It will skip values that are not decryptable.
"""
import os
import sys
from cryptography.fernet import Fernet, InvalidToken

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User


def make_fernet_from_key(key):
    try:
        return Fernet(key)
    except Exception as e:
        print('Invalid key provided:', e)
        return None


def main():
    old_key = os.environ.get('OLD_TOTP_ENC_KEY')
    new_key = os.environ.get('NEW_TOTP_ENC_KEY')
    if not old_key or not new_key:
        print('Please set OLD_TOTP_ENC_KEY and NEW_TOTP_ENC_KEY in the environment')
        return

    old_f = make_fernet_from_key(old_key)
    new_f = make_fernet_from_key(new_key)
    if not old_f or not new_f:
        return

    app = create_app()
    with app.app_context():
        users = User.query.filter(User.totp_secret != None).all()
        print(f'Found {len(users)} users with non-null totp_secret')
        updated = 0
        for u in users:
            val = u.totp_secret
            if not isinstance(val, str):
                continue
            if val.startswith('enc:'):
                token = val[len('enc:'):]
                try:
                    plain = old_f.decrypt(token.encode('utf-8')).decode('utf-8')
                except InvalidToken:
                    print(f'Skipping user {u.id}: cannot decrypt with OLD key')
                    continue
                # encrypt with new key
                new_token = new_f.encrypt(plain.encode('utf-8')).decode('utf-8')
                u.totp_secret = f'enc:{new_token}'
                u.totp_encrypted = True
                db.session.add(u)
                updated += 1
        if updated:
            db.session.commit()
        print(f'Re-encrypted {updated} user secrets')


if __name__ == '__main__':
    main()
