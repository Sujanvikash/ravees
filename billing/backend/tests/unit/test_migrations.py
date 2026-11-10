from alembic.config import Config
from alembic.script import ScriptDirectory

from app.core.config import BACKEND_DIR


def test_the_migrations_are_one_line():
    """The server runs `alembic upgrade head` before it starts the API, and that refuses to run when two migrations
    share a revision or follow the same one (two heads): the API then never starts."""
    script = ScriptDirectory.from_config(Config(BACKEND_DIR / 'alembic.ini'))
    files = list((BACKEND_DIR / 'migrations' / 'versions').glob('[0-9]*.py'))
    revisions = [r.revision for r in script.walk_revisions()]
    assert len(revisions) == len(set(revisions)) == len(files)
    assert len(script.get_heads()) == 1
