"""Utility for generating duplicate inspection reports.

This first implementation focuses on metadata-level duplicate inspection
rather than image fingerprinting. It groups JSON records by keys such as
SHA-256, perceptual hash, source URL, and OCR text so reviewers can quickly
spot likely duplicate or near-duplicate entries.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class DuplicateInspectionRequest:
    """Inputs for generating a duplicate inspection report."""

    dataset_root: Path
    output_path: Path


def _iter_json_files(dataset_root: Path) -> list[Path]:
    """Return candidate dataset files, excluding JSON schemas."""
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


def _record_id(payload: dict[str, Any], path: Path) -> str:
    """Resolve the most useful identifier for a record."""
    for key in ("asset_id", "image_id", "crop_id", "feedback_id", "id"):
        if key in payload:
            return str(payload[key])
    return str(path)


def _normalized_text(value: Any) -> str | None:
    """Normalize text-like values for grouping."""
    if value in (None, "", []):
        return None
    text = " ".join(str(value).strip().lower().split())
    return text or None


def _candidate_keys(payload: dict[str, Any]) -> dict[str, str]:
    """Extract duplicate-inspection keys from a dataset record."""
    candidates = {
        "sha256": _normalized_text(payload.get("sha256")),
        "phash": _normalized_text(payload.get("phash")),
        "source_url": _normalized_text(payload.get("source_url")),
        "ocr_text": _normalized_text(payload.get("ocr_text")),
    }

    weak_labels = payload.get("weak_labels")
    if isinstance(weak_labels, dict):
        manufacturer = _normalized_text(weak_labels.get("manufacturer"))
        device_type = _normalized_text(weak_labels.get("device_type"))
        if manufacturer or device_type:
            candidates["weak_label_pair"] = f"{manufacturer or 'unknown'}::{device_type or 'unknown'}"

    return {key: value for key, value in candidates.items() if value}


def inspect_duplicates(request: DuplicateInspectionRequest) -> Path:
    """Generate a duplicate inspection report for manual review."""
    dataset_root = request.dataset_root.resolve()
    output_path = request.output_path.resolve()

    groups: dict[str, dict[str, list[dict[str, Any]]]] = {}

    for path in _iter_json_files(dataset_root):
        payload = _read_json(path)
        record = {
          "id": _record_id(payload, path.relative_to(dataset_root)),
          "relative_path": str(path.relative_to(dataset_root)),
        }

        for key_name, key_value in _candidate_keys(payload).items():
            group_map = groups.setdefault(key_name, {})
            group_map.setdefault(key_value, []).append(record)

    duplicate_groups: dict[str, list[dict[str, Any]]] = {}
    for group_name, grouped_records in groups.items():
        entries: list[dict[str, Any]] = []
        for key_value, records in grouped_records.items():
            if len(records) < 2:
                continue
            entries.append(
                {
                    "key": key_value,
                    "record_count": len(records),
                    "records": records,
                }
            )
        duplicate_groups[group_name] = sorted(entries, key=lambda item: item["record_count"], reverse=True)

    payload = {
        "dataset_root": str(dataset_root),
        "duplicate_groups": duplicate_groups,
        "group_types": sorted(duplicate_groups.keys()),
        "group_count": sum(len(entries) for entries in duplicate_groups.values()),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return output_path


def _request_to_json_payload(request: DuplicateInspectionRequest) -> dict[str, Any]:
    """Convert request dataclass into a JSON-safe dictionary."""
    return {
        "dataset_root": str(request.dataset_root),
        "output_path": str(request.output_path),
    }


def main() -> int:
    """CLI for duplicate inspection report generation."""
    parser = argparse.ArgumentParser(description="Build a metadata duplicate inspection report.")
    parser.add_argument("dataset_root", type=Path, help="Root directory containing dataset records.")
    parser.add_argument("output_path", type=Path, help="Path to write the duplicate report JSON.")
    args = parser.parse_args()

    request = DuplicateInspectionRequest(dataset_root=args.dataset_root, output_path=args.output_path)
    output_path = inspect_duplicates(request)
    print(json.dumps({"output_path": str(output_path), "request": _request_to_json_payload(request)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
