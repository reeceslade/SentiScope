"""empty message

Revision ID: 80afb1cc2cf1
Revises: 8ae2eba89a70
Create Date: 2025-04-10 10:14:45.450263

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '80afb1cc2cf1'
down_revision = '8ae2eba89a70'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('feedback', schema=None) as batch_op:
        batch_op.create_unique_constraint('unique_user_item_feedback', ['user_id', 'item_title'])

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('feedback', schema=None) as batch_op:
        batch_op.drop_constraint('unique_user_item_feedback', type_='unique')

    # ### end Alembic commands ###
