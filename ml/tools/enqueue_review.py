"""CLI wrapper for creating review-queue items from dataset records."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from ml.collector.review_queue import enqueue_record_for_review
from ml.collector.source_registry import index_registry_by_domain, load_source_registry


def _load_record(path: Path) -> dict[str, Any]:
    """Load one dataset record from disk."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return payload


def enqueue_review_items(
    input_dir: Path,
    queue_dir: Path,
    source_registry_path: Path,
) -> list[Path]:
    """Create review queue items for all records in an input tree."""
    entries = load_source_registry(source_registry_path)
    registry = index_registry_by_domain(entries)

    output_paths: list[Path] = []
    for path in sorted(input_dir.rglob("*.json")):
        if not path.is_file():
            continue
        record = _load_record(path)
        output_paths.append(enqueue_record_for_review(record, queue_dir, registry))

    return output_paths


def main() -> int:
    """CLI entry point for review queue creation."""
    parser = argparse.ArgumentParser(description="Create review queue items from dataset records.")
    parser.add_argument("input_dir", type=Path, help="Directory containing JSON records.")
    parser.add_argument("queue_dir", type=Path, help="Directory to write review queue items into.")
    parser.add_argument(
        "--source-registry",
        type=Path,
        default=Path("ml/configs/sources/approved_sources.yaml"),
        help="Path to the approved source registry YAML file.",
    )
    args = parser.parse_args()

    output_paths = enqueue_review_items(args.input_dir, args.queue_dir, args.source_registry)
    print(
        json.dumps(
            {
                "queued_count": len(output_paths),
                "output_paths": [str(path) for path in output_paths],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
