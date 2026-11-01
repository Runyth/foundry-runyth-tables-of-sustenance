# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MID = "runyth-tables-of-sustenance"
for kind in ("foods", "recipes", "tables"):
    values = json.loads((ROOT / "data" / f"{kind}.json").read_text(encoding="utf-8"))
    target = ROOT / "packs-src" / kind
    target.mkdir(parents=True, exist_ok=True)
    existing = {p.name: p for p in target.glob("*.json")}
    wanted = set()
    for value in values:
        source_id = value.get("flags", {}).get(MID, {}).get("sourceId", value["_id"])
        safe = "".join(ch.lower() if ch.isalnum() else "-" for ch in source_id).strip("-")
        name = f"{safe}-{value['_id']}.json"
        wanted.add(name)
        (target / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for name, path in existing.items():
        if name not in wanted:
            path.unlink()
index_path = ROOT / "data" / "content-index.json"
index = json.loads(index_path.read_text(encoding="utf-8"))
index["version"] = json.loads((ROOT / "module.json").read_text(encoding="utf-8"))["version"]
index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Synchronized canonical system-neutral content sources.")
