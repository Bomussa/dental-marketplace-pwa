#!/usr/bin/env python3
"""Generate a data-free, current-schema Supabase baseline from catalog-only snapshots.

This script never connects to a database. It consumes locally supplied catalog snapshots
that contain DDL only, then writes a single snapshot migration suitable for a fresh
Supabase project. It intentionally does not export rows, Auth users, secrets, or settings.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

SNAPSHOT_ORDER = (
    "asnani-production-extensions-types-ddl.json",
    "asnani-production-table-ddl.json",
    "asnani-production-functions-ddl.json",
    "asnani-production-constraints-ddl.json",
    "asnani-production-indexes-triggers-ddl.json",
    "asnani-production-rls-force-ddl.json",
    "asnani-production-rls-policies-ddl.json",
)


def ddl_rows(path: Path) -> list[str]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    values: list[str] = []
    for row in rows:
        ddl = row.get("ddl")
        if not isinstance(ddl, str) or not ddl.strip():
            raise ValueError(f"{path}: expected a non-empty ddl field")
        # The table catalog export double-escaped line breaks; normalize only that artifact.
        if path.name == "asnani-production-table-ddl.json":
            ddl = ddl.replace("\\n", "\n")
            # pg_catalog identifies bookings.booking_period as a STORED generated column;
            # the ordinary table export represented it as a column-reference DEFAULT.
            ddl = ddl.replace(
                "booking_period tstzrange default tstzrange(start_at, end_at, '[)'::text)",
                "booking_period tstzrange generated always as (tstzrange(start_at, end_at, '[)'::text)) stored",
            )
        # PostgreSQL accepts only WITH CHECK for INSERT. The catalog export retained a
        # redundant USING (true) clause, whose semantics are ignored for INSERT.
        if path.name == "asnani-production-rls-policies-ddl.json" and " for insert " in ddl.lower() and " using (true) with check " in ddl.lower():
            marker = " using (true) with check "
            lower_ddl = ddl.lower()
            index = lower_ddl.index(marker)
            ddl = ddl[:index] + " with check " + ddl[index + len(marker):]
        values.append(ddl.strip())
    return values


def grant_rows(path: Path) -> list[str]:
    """Extract catalog-generated GRANT statements from a captured MCP result."""
    envelope = json.loads(path.read_text(encoding="utf-8"))
    result = envelope.get("result")
    if not isinstance(result, str):
        raise ValueError(f"{path}: missing result string")
    match = re.search(r"<untrusted-data-[^>]+>\s*(\[.*?\])\s*</untrusted-data-[^>]+>", result, re.S)
    if not match:
        raise ValueError(f"{path}: could not locate structured grant payload")
    rows = json.loads(match.group(1))
    grants = []
    for row in rows:
        ddl = row.get("ddl")
        if isinstance(ddl, str) and ddl.lower().startswith("grant "):
            grants.append(ddl.strip())
    return sorted(set(grants))


def render(snapshot_dir: Path, grants_file: Path) -> str:
    sections: list[tuple[str, list[str]]] = []
    for filename in SNAPSHOT_ORDER:
        path = snapshot_dir / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        sections.append((filename.removesuffix(".json"), ddl_rows(path)))

    grants = grant_rows(grants_file)
    lines = [
        "-- Asnani current-schema baseline (catalog-only; no row data, secrets, or Auth users).",
        "-- Generated from a read-only catalog snapshot. Regenerate with scripts/generate-schema-baseline.py.",
        "-- This is a snapshot track and must be applied alone to a fresh database; do not combine it with the legacy incremental track.",
        "begin;",
        "",
        "create schema if not exists private;",
        "revoke all on schema private from public;",
        "",
    ]
    for title, ddls in sections:
        lines.extend((f"-- BEGIN {title}", ""))
        for ddl in ddls:
            lines.extend((ddl + ("" if ddl.endswith(";") else ";"), ""))
        lines.extend((f"-- END {title}", ""))

    lines.extend(("-- BEGIN explicit role grants captured from catalog", ""))
    for ddl in grants:
        lines.extend((ddl, ""))
    lines.extend(("-- END explicit role grants captured from catalog", "", "commit;", ""))
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot-dir", required=True, type=Path)
    parser.add_argument("--grants-result", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    content = render(args.snapshot_dir, args.grants_result)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"wrote {args.output} ({len(content.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
