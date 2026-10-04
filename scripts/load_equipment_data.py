"""Build the equipment SQLite database from the AI4I 2020 Predictive Maintenance dataset.

    python scripts/load_equipment_data.py            # download from UCI
    python scripts/load_equipment_data.py ai4i2020.csv   # or use a local copy

Writes api/assistant/data/equipment.db (bundled with the deployment through
vercel.json includeFiles). Dataset: https://doi.org/10.24432/C5HS5C (CC BY 4.0).
"""

import csv
import io
import sqlite3
import sys
import urllib.request
import zipfile
from pathlib import Path

UCI_URL = "https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip"
DEFAULT_DB = Path(__file__).resolve().parents[1] / "api" / "assistant" / "data" / "equipment.db"

# CSV header -> (column name, SQLite type). Units are in the name so the model never has to guess.
COLUMNS = {
    "UDI": ("udi", "INTEGER PRIMARY KEY"),
    "Product ID": ("product_id", "TEXT"),
    "Type": ("type", "TEXT"),  # quality variant: L, M or H
    "Air temperature [K]": ("air_temp_k", "REAL"),
    "Process temperature [K]": ("process_temp_k", "REAL"),
    "Rotational speed [rpm]": ("rotational_speed_rpm", "INTEGER"),
    "Torque [Nm]": ("torque_nm", "REAL"),
    "Tool wear [min]": ("tool_wear_min", "INTEGER"),
    "Machine failure": ("machine_failure", "INTEGER"),
    "TWF": ("twf", "INTEGER"),  # tool wear failure
    "HDF": ("hdf", "INTEGER"),  # heat dissipation failure
    "PWF": ("pwf", "INTEGER"),  # power failure
    "OSF": ("osf", "INTEGER"),  # overstrain failure
    "RNF": ("rnf", "INTEGER"),  # random failure
}


def read_csv_text(source: str | None) -> str:
    if source:
        return Path(source).read_text(encoding="utf-8-sig")
    with urllib.request.urlopen(UCI_URL, timeout=60) as resp:
        archive = zipfile.ZipFile(io.BytesIO(resp.read()))
    return archive.read("ai4i2020.csv").decode("utf-8-sig")


def build_database(csv_text: str, db_path: Path = DEFAULT_DB) -> int:
    """Create db_path from the CSV text and return the number of rows loaded."""
    reader = csv.DictReader(io.StringIO(csv_text))
    missing = set(COLUMNS) - set(reader.fieldnames or [])
    if missing:
        raise ValueError(f"CSV is missing columns: {sorted(missing)}")
    rows = [tuple(row[h] for h in COLUMNS) for row in reader]
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)
    con = sqlite3.connect(db_path)
    try:
        con.execute(f"CREATE TABLE machines ({', '.join(f'{n} {t}' for n, t in COLUMNS.values())})")
        con.executemany(f"INSERT INTO machines VALUES ({', '.join('?' * len(COLUMNS))})", rows)
        con.commit()
        con.execute("VACUUM")
    finally:
        con.close()
    return len(rows)


if __name__ == "__main__":
    count = build_database(read_csv_text(sys.argv[1] if len(sys.argv) > 1 else None))
    print(f"Loaded {count} rows into {DEFAULT_DB}")
