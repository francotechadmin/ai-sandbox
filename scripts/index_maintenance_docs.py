"""Index the maintenance documents into Upstash Vector. Run once at setup, not at runtime.

    UPSTASH_VECTOR_REST_URL=... UPSTASH_VECTOR_REST_TOKEN=... python scripts/index_maintenance_docs.py [dir ...]

Reads every .md and .txt file under docs/maintenance (or the directories given), splits it into
chunks, and upserts each chunk as data=<text> with metadata {"source", "title"}. That is the shape
search_maintenance_docs expects. The index must have an Upstash embedding model enabled, which embeds
the text on upsert. Ids are stable, so re-running replaces rather than duplicates.
"""

import re
import sys
from pathlib import Path

DOCS_DIR = Path(__file__).resolve().parents[1] / "docs" / "maintenance"
MAX_CHUNK_CHARS = 1200


def split_text(text: str, limit: int = MAX_CHUNK_CHARS) -> list[str]:
    """Break text on blank lines into pieces no longer than `limit` characters."""
    pieces, current = [], ""
    for para in re.split(r"\n\s*\n", text.strip()):
        if current and len(current) + len(para) + 2 > limit:
            pieces.append(current)
            current = ""
        current = f"{current}\n\n{para}" if current else para
    if current:
        pieces.append(current)
    return pieces


def chunk_document(text: str, fallback_title: str) -> list[tuple[str, str]]:
    """(title, chunk text) pairs. The document title is the first `# ` heading; each `## ` section is a chunk
    that starts with the document title so it still makes sense on its own."""
    match = re.match(r"\s*# (.+)", text)
    title = match.group(1).strip() if match else fallback_title
    body = text[match.end() :] if match else text
    intro, *sections = re.split(r"(?m)^## ", body)
    chunks = [(title, f"{title}\n\n{part}") for part in split_text(intro)]
    for section in sections:
        heading, _, rest = section.partition("\n")
        label = f"{title} / {heading.strip()}"
        chunks += [(label, f"{title}\n\n{part}") for part in split_text(rest)]
    return chunks


def collect(dirs: list[Path]) -> list[dict]:
    """Upsert-ready items for every document under dirs."""
    items = []
    for root in dirs:
        for path in sorted(p for p in root.rglob("*") if p.suffix in (".md", ".txt")):
            kind = path.parent.name.rstrip("s").capitalize()  # runbooks/ -> Runbook
            doc_title = path.stem.replace("-", " ").capitalize()
            for n, (title, text) in enumerate(chunk_document(path.read_text(encoding="utf-8"), doc_title)):
                items.append(
                    {
                        "id": f"{path.relative_to(root).with_suffix('')}#{n}",
                        "data": text,
                        "metadata": {"source": f"{kind}: {title.split(' / ')[0]}", "title": title},
                    }
                )
    return items


if __name__ == "__main__":
    from upstash_vector import Index

    items = collect([Path(a) for a in sys.argv[1:]] or [DOCS_DIR])
    index = Index.from_env()
    for start in range(0, len(items), 100):
        index.upsert(items[start : start + 100])
    print(f"Indexed {len(items)} chunks.")
