from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_columns() -> None:
    """Tiny auto-migration: add columns that exist in the models but not yet in the database
    (e.g. new profile fields), filling existing rows with the model default. Keeps your data.
    For bigger schema changes later, switch to Alembic."""
    from sqlalchemy import JSON, inspect, text

    insp = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not insp.has_table(table.name):
                continue
            existing = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in existing:
                    continue
                ddl = col.type.compile(dialect=engine.dialect)
                conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN "{col.name}" {ddl}'))
                default = None
                if col.default is not None:
                    if col.default.is_callable:
                        default = [] if isinstance(col.type, JSON) else None
                    else:
                        default = col.default.arg
                if default is not None:
                    conn.execute(table.update().values({col.name: default}))
