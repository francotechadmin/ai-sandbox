import importlib.util
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest

from api.assistant import tools

ROOT = Path(__file__).resolve().parents[2]
HEADER = (
    "UDI,Product ID,Type,Air temperature [K],Process temperature [K],Rotational speed [rpm],"
    "Torque [Nm],Tool wear [min],Machine failure,TWF,HDF,PWF,OSF,RNF"
)
CSV = f"""{HEADER}
1,M14860,M,298.1,308.6,1551,42.8,0,0,0,0,0,0,0
2,L47181,L,298.2,308.7,1408,46.3,3,0,0,0,0,0,0
3,L47182,L,298.1,308.5,1498,49.4,5,1,0,1,0,0,0
4,H29441,H,300.0,310.0,1300,60.0,230,1,1,0,0,0,0
"""


@pytest.fixture
def equipment_db(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location("load_equipment_data", ROOT / "scripts" / "load_equipment_data.py")
    loader = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loader)
    path = tmp_path / "equipment.db"
    assert loader.build_database(CSV, path) == 4
    monkeypatch.setenv("EQUIPMENT_DB_PATH", str(path))
    return path


def test_loader_renames_columns_and_keeps_every_row(equipment_db):
    con = sqlite3.connect(equipment_db)
    cols = [r[1] for r in con.execute("PRAGMA table_info(machines)")]
    assert cols[:4] == ["udi", "product_id", "type", "air_temp_k"] and len(cols) == 14
    assert con.execute("SELECT SUM(machine_failure) FROM machines").fetchone() == (2,)


def test_loader_rejects_a_csv_with_missing_columns(tmp_path):
    spec = importlib.util.spec_from_file_location("load_equipment_data", ROOT / "scripts" / "load_equipment_data.py")
    loader = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loader)
    with pytest.raises(ValueError):
        loader.build_database("UDI,Type\n1,L\n", tmp_path / "x.db")


@pytest.mark.asyncio
async def test_select_returns_rows(equipment_db):
    out = await tools.query_equipment_data.ainvoke({"sql": "SELECT type, COUNT(*) FROM machines GROUP BY type"})
    assert "('H', 1)" in out and "('L', 2)" in out


@pytest.mark.asyncio
async def test_aggregates_with_cte_are_allowed(equipment_db):
    out = await tools.query_equipment_data.ainvoke(
        {"sql": "WITH f AS (SELECT * FROM machines WHERE hdf = 1) SELECT COUNT(*) FROM f;"}
    )
    assert out == "[(1,)]"


@pytest.mark.parametrize(
    "sql",
    [
        "DROP TABLE machines",
        "DELETE FROM machines",
        "UPDATE machines SET type = 'H'",
        "INSERT INTO machines (udi) VALUES (99)",
        "SELECT 1; DROP TABLE machines",
        "PRAGMA writable_schema = 1",
        "ATTACH DATABASE 'x.db' AS x",
        "  ",
    ],
)
@pytest.mark.asyncio
async def test_writes_and_extra_statements_are_rejected(equipment_db, sql):
    out = await tools.query_equipment_data.ainvoke({"sql": sql})
    assert out.startswith("Error:")
    # and the data is untouched
    assert sqlite3.connect(equipment_db).execute("SELECT COUNT(*) FROM machines").fetchone() == (4,)


@pytest.mark.asyncio
async def test_database_is_opened_read_only(equipment_db):
    # Even if a statement got past the check, SQLite refuses to write.
    db = tools._equipment_db()
    with pytest.raises(Exception, match="readonly"):
        db.run("DELETE FROM machines")


@pytest.mark.asyncio
async def test_bad_sql_and_missing_database_come_back_as_errors(equipment_db, monkeypatch):
    assert (await tools.query_equipment_data.ainvoke({"sql": "SELECT nope FROM machines"})).startswith("Error:")
    monkeypatch.setenv("EQUIPMENT_DB_PATH", str(equipment_db.parent / "missing.db"))
    out = await tools.query_equipment_data.ainvoke({"sql": "SELECT 1"})
    assert out == "Error: the equipment database is not available."


@pytest.mark.asyncio
async def test_long_results_are_truncated(equipment_db):
    out = await tools.query_equipment_data.ainvoke(
        {"sql": "SELECT a.udi, b.udi FROM machines a, machines b, machines c, machines d, machines e"}
    )
    assert len(out) < tools._MAX_RESULT_CHARS + 100 and "truncated" in out


# -- search_maintenance_docs (against a mock index; no Upstash credentials needed) --
class FakeIndex:
    def __init__(self, hits):
        self.hits, self.calls = hits, []

    def query(self, **kwargs):
        self.calls.append(kwargs)
        return self.hits


def hit(id, score, data, **meta):
    return SimpleNamespace(id=id, score=score, data=data, metadata=meta)


@pytest.fixture
def docs_env(monkeypatch):
    monkeypatch.setenv("UPSTASH_VECTOR_REST_URL", "https://example.upstash.io")
    monkeypatch.setenv("UPSTASH_VECTOR_REST_TOKEN", "t")


@pytest.mark.asyncio
async def test_search_returns_ranked_passages_with_citations(docs_env, monkeypatch):
    index = FakeIndex(
        [
            hit("a", 0.91, "Replace the tool at 200 min of wear.", source="Runbook: tool wear", title="Replacement"),
            hit("b", 0.74, "Lock out the machine before service.", source="OSHA 1910.147"),
        ]
    )
    monkeypatch.setattr(tools, "_docs_index", lambda: index)
    out = await tools.search_maintenance_docs.ainvoke({"query": "when to replace a worn tool"})
    first, second = out.split("\n\n")
    assert first.startswith("[1] (Runbook: tool wear, Replacement; relevance 0.91)") and "200 min" in first
    assert second.startswith("[2] (OSHA 1910.147; relevance 0.74)")
    assert index.calls == [
        {"data": "when to replace a worn tool", "top_k": 4, "include_metadata": True, "include_data": True}
    ]


@pytest.mark.asyncio
async def test_search_handles_no_hits_missing_config_and_failures(docs_env, monkeypatch):
    monkeypatch.setattr(tools, "_docs_index", lambda: FakeIndex([]))
    assert await tools.search_maintenance_docs.ainvoke({"query": "x"}) == "No matching documents."

    def boom():
        raise RuntimeError("503")

    monkeypatch.setattr(tools, "_docs_index", boom)
    assert "document search failed (503)" in await tools.search_maintenance_docs.ainvoke({"query": "x"})

    monkeypatch.delenv("UPSTASH_VECTOR_REST_TOKEN")
    assert await tools.search_maintenance_docs.ainvoke({"query": "x"}) == "Error: the document index is not configured."


@pytest.mark.asyncio
async def test_the_bundled_database_is_the_full_dataset(monkeypatch):
    monkeypatch.delenv("EQUIPMENT_DB_PATH", raising=False)
    out = await tools.query_equipment_data.ainvoke(
        {"sql": "SELECT COUNT(*), SUM(machine_failure), SUM(twf), SUM(hdf), SUM(pwf), SUM(osf), SUM(rnf) FROM machines"}
    )
    assert out == "[(10000, 339, 46, 115, 95, 98, 19)]"
