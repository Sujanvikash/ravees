"""the stores' highlights no longer call a store the flagship

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-12 16:00:00

Each store is now a branch of its own on the website (Chennai - Egmore and Chennai - ECR apart), and the client
asked for no "Flagship" anywhere: the highlight lines that mention it go (Chennai's "Our flagship store in
Egmore, and a second store on ECR at Palavakkam").
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: str | Sequence[str] | None = '0002'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            'UPDATE showrooms SET features = COALESCE((SELECT jsonb_agg(f) FROM jsonb_array_elements_text(features) f '
            "WHERE f NOT ILIKE '%flagship%'), '[]'::jsonb) WHERE features::text ILIKE '%flagship%'"
        )
    )


def downgrade() -> None:
    pass
