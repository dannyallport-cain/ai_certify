"""CLI wrapper for normalizing raw asset records into dataset-ready JSON."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from ml.collector.normalize import normalize_asset_record, write_normalized_asset


def _load_record(path: Path) -> dict[str, Any]:
    """Load one raw JSON record from disk."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return payload


def normalize_records(input_dir: Path, output_dir: Path) -> list[Path]:
    """Normalize all JSON records in an input directory tree."""
    output_paths: list[Path] = []

    for path in sorted(input_dir.rglob("*.json")):
        if not path.is_file():
            continue
        raw_record = _load_record(path)
        normalized = normalize_asset_record(raw_record)
        output_paths.append(write_normalized_asset(normalized, output_dir))

    return output_paths


def main() -> int:
    """CLI entry point for batch normalization."""
    parser = argparse.ArgumentParser(description="Normalize raw ML asset records.")
    parser.add_argument("input_dir", type=Path, help="Directory containing raw JSON records.")
    parser.add_argument("output_dir", type=Path, help="Directory to write normalized JSON records.")
    args = parser.parse_args()

    output_paths = normalize_records(args.input_dir, args.output_dir)
    print(
        json.dumps(
            {
                "normalized_count": len(output_paths),
                "output_paths": [str(path) for path in output_paths],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
