"""PostgreSQL database connectivity using psycopg 3 connection pool."""
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.settings import settings

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    """Lazy initialize and return the global psycopg connection pool."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=settings.DATABASE_URL,
            min_size=0,
            max_size=4,
            kwargs={"row_factory": dict_row},
            open=False,
        )
        _pool.open()
    return _pool


def close_pool() -> None:
    """Close the global connection pool."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def get_connection() -> Generator[psycopg.Connection[dict[str, Any]], None, None]:
    """Context manager yielding a connection from the pool."""
    pool = get_pool()
    with pool.connection() as conn:
        yield conn


def fetch_one(query: str, params: dict[str, Any] | tuple[Any, ...] | None = None) -> dict[str, Any] | None:
    """Execute a query and fetch a single dict row."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone()


def fetch_all(query: str, params: dict[str, Any] | tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
    """Execute a query and fetch all dict rows."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


def execute(query: str, params: dict[str, Any] | tuple[Any, ...] | None = None) -> None:
    """Execute an SQL statement and commit transaction."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
        conn.commit()
