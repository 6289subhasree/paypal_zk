"""Tiny schema upgrade for existing local databases.

`create_all` creates missing tables but never changes existing ones. When a
release adds columns, this adds them (nullable) so an existing demo database
keeps working without a reset. Real deployments would use Alembic.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from .db import Base


def add_missing_columns(engine: Engine) -> list[str]:
    added = []
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            have = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in have:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'))
                added.append(f"{table.name}.{column.name}")
    return added


def retire_old_credentials(engine: Engine, current_circuit: str) -> int:
    """Credentials signed for an older circuit can't produce proofs any more.

    Mark them revoked so the holder is prompted to issue a new Passport.
    """
    with engine.begin() as conn:
        result = conn.execute(
            text("UPDATE credentials SET status = 'revoked' "
                 "WHERE status = 'active' AND circuit_version != :v"),
            {"v": current_circuit},
        )
        return result.rowcount or 0
