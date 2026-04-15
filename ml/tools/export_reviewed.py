"""CLI wrapper for exporting approved reviewed items and building a manifest."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from ml.collector.export_reviewed import build_reviewed_manifest, export_reviewed_items


def main() -> int:
    """CLI entry point for reviewed export."""
    parser = argparse.ArgumentParser(description="Export approved reviewed items into reviewed datasets.")
    parser.add_argument("queue_dir", type=Path, help="Directory containing review queue JSON items.")
    parser.add_argument("output_dir", type=Path, help="Directory to write reviewed dataset JSON files.")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("ml/datasets/exports/reviewed-manifest.json"),
        help="Path to write the reviewed manifest JSON file.",
    )
    args = parser.parse_args()

    result = export_reviewed_items(args.queue_dir, args.output_dir)
    manifest_path = build_reviewed_manifest(args.output_dir, args.manifest)

    print(
        json.dumps(
            {
                "result": asdict(result),
                "manifest_path": str(manifest_path),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
