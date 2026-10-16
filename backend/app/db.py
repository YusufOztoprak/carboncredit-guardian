from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

connect_args = {"check_same_thread": False} if settings.sqlalchemy_url.startswith("sqlite") else {}
engine = create_engine(settings.sqlalchemy_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: one DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def add_missing_columns() -> None:
    """Hackathon-sized migration: add new nullable columns to existing tables.

    create_all() only creates missing tables, it never alters existing ones,
    so columns added to the models later are added here. Safe to run on every start.
    """
    is_postgres = engine.dialect.name == "postgresql"
    with engine.begin() as conn:
        inspector = inspect(conn)
        existing_tables = set(inspector.get_table_names())
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in present or not column.nullable:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                if_not_exists = "IF NOT EXISTS " if is_postgres else ""
                conn.execute(
                    text(f"ALTER TABLE {table.name} ADD COLUMN {if_not_exists}{column.name} {col_type}")
                )