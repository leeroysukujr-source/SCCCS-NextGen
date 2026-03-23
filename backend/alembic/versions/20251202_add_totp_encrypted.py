"""add totp_encrypted column to users

Revision ID: 20251202_add_totp_encrypted
Revises: 20251201_encrypt_totp_secret
Create Date: 2025-12-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251202_add_totp_encrypted'
down_revision = '20251201_encrypt_totp_secret'
branch_labels = None
depends_on = None


def upgrade():
    # Add column with default False
    op.add_column('users', sa.Column('totp_encrypted', sa.Boolean(), nullable=False, server_default=sa.sql.expression.false()))
    # Update rows where totp_secret appears encrypted (prefix 'enc:')
    conn = op.get_bind()
    conn.execute("UPDATE users SET totp_encrypted = TRUE WHERE totp_secret IS NOT NULL AND totp_secret LIKE 'enc:%'")


def downgrade():
    op.drop_column('users', 'totp_encrypted')
