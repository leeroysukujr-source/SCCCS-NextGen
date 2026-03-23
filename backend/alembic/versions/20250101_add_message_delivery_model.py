"""Add MessageDelivery model for message delivery acknowledgements

Revision ID: 20250101_001
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250101_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create message_deliveries table
    op.create_table(
        'message_deliveries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('delivered_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('message_id', 'user_id', name='unique_message_delivery')
    )
    
    # Create indexes for faster queries
    op.create_index(op.f('ix_message_deliveries_message_id'), 'message_deliveries', ['message_id'], unique=False)
    op.create_index(op.f('ix_message_deliveries_user_id'), 'message_deliveries', ['user_id'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_message_deliveries_user_id'), table_name='message_deliveries')
    op.drop_index(op.f('ix_message_deliveries_message_id'), table_name='message_deliveries')
    
    # Drop table
    op.drop_table('message_deliveries')
