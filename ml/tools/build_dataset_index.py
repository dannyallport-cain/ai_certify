"""Utility scaffolding for building dataset indexes.

A dataset index makes it easier to inspect assets, labels, approvals, and
split membership without assuming any particular storage backend.

This implementation scans JSON records under a dataset root and writes a
summary index JSON file that can be consumed by later review and training
tooling.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class DatasetIndexRequest:
    """Inputs for building or refreshing a dataset index."""

    dataset_root: Path
    output_path: Path


def _iter_json_files(dataset_root: Path) -> list[Path]:
    """Return dataset JSON files, excluding schema definitions."""
    return sorted(
        path
        for path in dataset_root.rglob("*.json")
        if path.is_file() and "schemas" not in path.parts
    )


def _read_json(path: Path) -> dict[str, Any]:
    """Read a JSON object from disk."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return payload


def _infer_record_type(path: Path, payload: dict[str, Any]) -> str:
    """Infer a record type using file path and known keys."""
    if "feedback_id" in payload:
        return "scan_feedback"
    if "crop_id" in payload:
        return "classification"
    if "image_id" in payload and "annotations" in payload:
        return "detection"
    if "asset_id" in payload:
        return "asset"

    parent = path.parent.name.lower()
    if parent in {"assets", "detections", "classification", "feedback"}:
        return parent

    return "unknown"


def _extract_summary(path: Path, payload: dict[str, Any]) -> dict[str, Any]:
    """Build a compact summary entry for the dataset index."""
    record_type = _infer_record_type(path, payload)

    summary: dict[str, Any] = {
        "path": str(path),
        "relative_path": str(path),
        "record_type": record_type,
        "keys": sorted(payload.keys()),
    }

    for key in (
        "asset_id",
        "image_id",
        "crop_id",
        "feedback_id",
        "source_domain",
        "manufacturer",
        "device_type",
        "split",
        "review_status",
        "reviewed",
    ):
        if key in payload:
            summary[key] = payload[key]

    if "annotations" in payload and isinstance(payload["annotations"], list):
        summary["annotation_count"] = len(payload["annotations"])

    return summary


def build_dataset_index(request: DatasetIndexRequest) -> Path:
    """Build an index artifact covering available dataset records."""
    dataset_root = request.dataset_root.resolve()
    output_path = request.output_path.resolve()

    records: list[dict[str, Any]] = []
    counts_by_type: dict[str, int] = {}

    for path in _iter_json_files(dataset_root):
        payload = _read_json(path)
        summary = _extract_summary(path.relative_to(dataset_root), payload)
        records.append(summary)

        record_type = str(summary["record_type"])
        counts_by_type[record_type] = counts_by_type.get(record_type, 0) + 1

    index_payload = {
        "dataset_root": str(dataset_root),
        "record_count": len(records),
        "counts_by_type": counts_by_type,
        "records": records,
        "request": {
            "dataset_root": str(request.dataset_root),
            "output_path": str(request.output_path),
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(index_payload, indent=2, sort_keys=True), encoding="utf-8")
    return output_path


def _request_to_json_payload(request: DatasetIndexRequest) -> dict[str, Any]:
    """Convert request dataclass into a JSON-safe dictionary."""
    return {
        "dataset_root": str(request.dataset_root),
        "output_path": str(request.output_path),
    }


def main() -> int:
    """CLI for dataset index generation."""
    parser = argparse.ArgumentParser(description="Build a dataset index for the ML workspace.")
    parser.add_argument("dataset_root", type=Path, help="Root directory containing dataset records.")
    parser.add_argument("output_path", type=Path, help="Path to write the generated index JSON.")
    args = parser.parse_args()

    request = DatasetIndexRequest(dataset_root=args.dataset_root, output_path=args.output_path)
    output_path = build_dataset_index(request)
    print(json.dumps({"output_path": str(output_path), "request": _request_to_json_payload(request)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
