"""encrypt totp_secret values

Revision ID: 20251201_encrypt_totp_secret
Revises: 
Create Date: 2025-12-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column, select
from sqlalchemy import String
import os

# revision identifiers, used by Alembic.
revision = '20251201_encrypt_totp_secret'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # This migration will encrypt existing totp_secret fields using TOTP_ENC_KEY (env var TOTP_ENC_KEY)
    # It will skip values already prefixed with 'enc:'. If TOTP_ENC_KEY is not set, it will skip.
    key = os.environ.get('TOTP_ENC_KEY')
    if not key:
        print('TOTP_ENC_KEY not set — skipping totp_secret encryption migration')
        return

    # import helper function from app utils
    try:
        from app.utils.crypto import encrypt_secret
    except Exception as e:
        print('Failed to import encryption helper:', e)
        return

    conn = op.get_bind()
    users = sa.table('user',
                     sa.column('id', sa.Integer),
                     sa.column('totp_secret', sa.String))

    results = conn.execute(sa.select(users.c.id, users.c.totp_secret))
    for row in results:
        uid = row[0]
        val = row[1]
        if not val:
            continue
        if isinstance(val, str) and val.startswith('enc:'):
            # already encrypted
            continue
        newval = encrypt_secret(val)
        if newval and newval != val:
            conn.execute(users.update().where(users.c.id == uid).values(totp_secret=newval))


def downgrade():
    # Downgrade is not reversible because we cannot decrypt without key here.
    print('Downgrade: no-op (cannot automatically decrypt totp_secret)')
    pass
