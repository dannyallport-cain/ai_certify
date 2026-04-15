"""Export helpers for reviewed queue items.

This module turns reviewed queue items into cleaned dataset records under
`ml/datasets/reviewed/` so downstream indexing, split generation, and
training-manifest tooling can consume only human-approved assets.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from ml.collector.normalize import NormalizedAssetRecord, normalize_asset_record
from ml.collector.review_queue import ReviewItem, load_review_queue


APPROVED_REVIEW_DECISIONS = {
    "approved",
    "approved_training",
    "approved_review_only",
}

REJECTED_REVIEW_DECISIONS = {
    "rejected",
    "blocked",
    "duplicate",
}


@dataclass(slots=True)
class ReviewedExportResult:
    """Summary of one reviewed-export run."""

    exported_count: int
    skipped_count: int
    rejected_count: int
    exported_paths: list[str]


def _review_item_record(item: ReviewItem) -> dict[str, Any]:
    """Extract the original source record embedded in a review item."""
    metadata = item.metadata or {}
    record = metadata.get("record")
    if not isinstance(record, dict):
        raise ValueError(f"Review item {item.item_id} is missing metadata.record")
    return record


def _merge_review_decision(
    record: dict[str, Any],
    item: ReviewItem,
) -> dict[str, Any]:
    """Overlay final review metadata on top of the original record."""
    merged = dict(record)
    metadata = item.metadata or {}
    weak_labels = metadata.get("weak_labels")
    source_approval = metadata.get("source_approval")

    merged["review_status"] = item.review_status
    if weak_labels and "weak_labels" not in merged:
        merged["weak_labels"] = weak_labels
    if source_approval and "source_approval" not in merged:
        merged["source_approval"] = source_approval
    if item.notes:
        merged["review_notes"] = item.notes

    return merged


def export_reviewed_items(
    queue_dir: str | Path,
    output_dir: str | Path,
) -> ReviewedExportResult:
    """Export approved review items as normalized reviewed dataset records."""
    items = load_review_queue(queue_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    exported_paths: list[str] = []
    skipped_count = 0
    rejected_count = 0

    for item in items:
        decision = item.review_status.strip().lower()
        if decision in REJECTED_REVIEW_DECISIONS:
            rejected_count += 1
            continue

        if decision not in APPROVED_REVIEW_DECISIONS:
            skipped_count += 1
            continue

        merged_record = _merge_review_decision(_review_item_record(item), item)
        normalized = normalize_asset_record(merged_record)

        reviewed_record = asdict(normalized)
        reviewed_record["review_status"] = item.review_status
        reviewed_record["review_item_id"] = item.item_id
        reviewed_record["review_priority"] = item.priority
        reviewed_record["review_notes"] = item.notes

        path = output_path / f"{normalized.asset_id}.json"
        path.write_text(json.dumps(reviewed_record, indent=2, sort_keys=True), encoding="utf-8")
        exported_paths.append(str(path))

    return ReviewedExportResult(
        exported_count=len(exported_paths),
        skipped_count=skipped_count,
        rejected_count=rejected_count,
        exported_paths=exported_paths,
    )


def build_reviewed_manifest(reviewed_dir: str | Path, output_path: str | Path) -> Path:
    """Build a compact manifest of reviewed dataset records."""
    reviewed_path = Path(reviewed_dir)
    records: list[dict[str, Any]] = []

    for path in sorted(reviewed_path.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        records.append(
            {
                "asset_id": payload.get("asset_id"),
                "relative_path": str(path),
                "review_status": payload.get("review_status"),
                "source_domain": payload.get("source_domain"),
                "license_status": payload.get("license_status"),
            }
        )

    manifest = {
        "reviewed_dir": str(reviewed_path.resolve()),
        "record_count": len(records),
        "records": records,
    }

    manifest_path = Path(output_path)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    return manifest_path
