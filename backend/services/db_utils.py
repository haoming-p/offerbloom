from typing import Any
from database import driver


def execute_read(query: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    with driver.session() as session:
        result = session.run(query, parameters or {})
        return [record.data() for record in result]


def execute_write(query: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    with driver.session() as session:
        records = session.execute_write(lambda tx: list(tx.run(query, parameters or {})))
        return [record.data() for record in records]
