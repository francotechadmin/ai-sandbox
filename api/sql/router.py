from fastapi import APIRouter

from .seed import get_connection

router = APIRouter(prefix="/api/sql", tags=["sql"])


@router.get("/schema")
def get_schema() -> dict:
    conn = get_connection()
    tables = []
    for (name,) in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall():
        columns = [
            {
                "name": row[1],
                "type": row[2],
                "nullable": not bool(row[3]),
                "primary_key": bool(row[5]),
            }
            for row in conn.execute(f"PRAGMA table_info({name})").fetchall()
        ]
        tables.append({"name": name, "columns": columns})
    conn.close()
    return {"tables": tables}
