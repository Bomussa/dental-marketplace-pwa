#!/usr/bin/env python3
"""Compare a fresh local schema inventory with the catalog-only Asnani snapshot.

The verifier compares object identity sets (not application data): public tables,
functions by schema/name/arity, constraints, RLS tables/policies, indexes, triggers,
extensions, and explicitly captured client-role grants.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path


def load_ddls(path: Path) -> list[str]:
    return [row["ddl"] for row in json.loads(path.read_text(encoding="utf-8"))]


def split_untrusted_json(envelope_path: Path) -> list[dict[str, str]]:
    envelope = json.loads(envelope_path.read_text(encoding="utf-8"))
    result = envelope["result"]
    match = re.search(r"<untrusted-data-[^>]+>\s*(\[.*?\])\s*</untrusted-data-[^>]+>", result, re.S)
    if not match:
        raise ValueError("grant payload missing")
    return json.loads(match.group(1))


def extract_expected(snapshot_dir: Path, grants_result: Path) -> dict[str, list[str]]:
    tables = []
    for ddl in load_ddls(snapshot_dir / "asnani-production-table-ddl.json"):
        match = re.search(r"create table public\.([a-z0-9_]+)", ddl, re.I)
        if not match:
            raise ValueError(f"table name missing in {ddl[:80]!r}")
        tables.append(match.group(1))

    functions = []
    for ddl in load_ddls(snapshot_dir / "asnani-production-functions-ddl.json"):
        match = re.search(r"function (public|private)\.([a-z0-9_]+)\((.*?)\)\s*\n", ddl, re.I | re.S)
        if not match:
            raise ValueError(f"function signature missing in {ddl[:100]!r}")
        args = match.group(3).strip()
        arity = 0 if not args else len([item for item in args.split(",") if item.strip()])
        functions.append(f"{match.group(1)}.{match.group(2)}/{arity}")

    constraints = []
    for ddl in load_ddls(snapshot_dir / "asnani-production-constraints-ddl.json"):
        match = re.search(r"add constraint ([^\s]+)", ddl, re.I)
        if match:
            constraints.append(match.group(1).strip('"'))

    policy_ddls = load_ddls(snapshot_dir / "asnani-production-rls-policies-ddl.json")
    policies = []
    for ddl in policy_ddls:
        match = re.search(r"create policy (?:\"([^\"]+)\"|([^\s]+)) on public\.([a-z0-9_]+)", ddl, re.I)
        if match:
            policies.append(f"{match.group(3)}.{match.group(1) or match.group(2)}")
    rls_tables = []
    for ddl in policy_ddls:
        match = re.search(r"alter table public\.([a-z0-9_]+) enable row level security", ddl, re.I)
        if match:
            rls_tables.append(match.group(1))

    index_trigger_ddls = load_ddls(snapshot_dir / "asnani-production-indexes-triggers-ddl.json")
    indexes = []
    triggers = []
    for ddl in index_trigger_ddls:
        index_match = re.search(r"create (?:unique )?index ([^\s]+)", ddl, re.I)
        if index_match:
            indexes.append(index_match.group(1).strip('"'))
        trigger_match = re.search(r"create trigger ([^\s]+)", ddl, re.I)
        if trigger_match:
            triggers.append(trigger_match.group(1).strip('"'))

    extensions = []
    for ddl in load_ddls(snapshot_dir / "asnani-production-extensions-types-ddl.json"):
        match = re.search(r"create extension if not exists \"?([^\"\s]+)", ddl, re.I)
        if match:
            extensions.append(match.group(1))

    grants = sorted({row["ddl"] for row in split_untrusted_json(grants_result) if row.get("ddl", "").lower().startswith("grant ")})
    return {
        "tables": sorted(tables),
        "functions": sorted(functions),
        "constraints": sorted(constraints),
        "rls_tables": sorted(set(rls_tables)),
        "policies": sorted(policies),
        "indexes": sorted(indexes),
        "triggers": sorted(triggers),
        "extensions": sorted(extensions),
        "grants": grants,
    }


def compare(name: str, expected: list[str], actual: list[str]) -> tuple[bool, str]:
    expected_count, actual_count = Counter(expected), Counter(actual)
    missing = sorted((expected_count - actual_count).elements())
    extra = sorted((actual_count - expected_count).elements())
    ok = not missing and not extra
    detail = f"{name}: expected={len(expected)} actual={len(actual)}"
    if missing:
        detail += f" missing={missing[:8]}"
    if extra:
        detail += f" extra={extra[:8]}"
    return ok, detail


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot-dir", required=True, type=Path)
    parser.add_argument("--grants-result", required=True, type=Path)
    parser.add_argument("--actual", required=True, type=Path)
    args = parser.parse_args()
    expected = extract_expected(args.snapshot_dir, args.grants_result)
    actual = json.loads(args.actual.read_text(encoding="utf-8"))
    actual["extensions"] = sorted(name for name in actual["extensions"] if name != "plpgsql")
    successful = True
    for name in ("tables", "functions", "constraints", "rls_tables", "policies", "indexes", "triggers", "extensions", "grants"):
        ok, detail = compare(name, expected[name], sorted(actual[name]))
        print(("PASS " if ok else "FAIL ") + detail)
        successful = successful and ok
    if not successful:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
