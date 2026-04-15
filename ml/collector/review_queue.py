"""Filesystem-backed review queue helpers for human verification workflows.

Human review is the gate that turns noisy bootstrap data into usable training
data. This module provides small, practical helpers to:

- persist review items as JSON records
- load queued review items from disk
- mark queue items as reviewed with a decision
- build queue items from collected dataset records and source policy state
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from ml.collector.source_registry import SourceApproval, SourceRegistryEntry, normalize_domain
from ml.collector.weak_labels import WeakLabelResult, build_weak_labels, to_serializable


@dataclass(slots=True)
class ReviewItem:
    """A queued asset or annotation awaiting human review."""

    item_id: str
    asset_id: str
    queue_name: str
    priority: int
    review_status: str = "pending"
    notes: str | None = None
    metadata: dict[str, Any] | None = None


def _queue_path(queue_dir: str | Path, item_id: str) -> Path:
    """Return the canonical storage path for a queue item."""
    return Path(queue_dir) / f"{item_id}.json"


def enqueue_review_item(item: ReviewItem, queue_dir: str | Path) -> Path:
    """Persist one review item to the filesystem-backed queue."""
    path = _queue_path(queue_dir, item.item_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(asdict(item), indent=2, sort_keys=True), encoding="utf-8")
    return path


def load_review_queue(queue_dir: str | Path) -> list[ReviewItem]:
    """Load pending review items from a queue directory."""
    queue_path = Path(queue_dir)
    if not queue_path.exists():
        return []

    items: list[ReviewItem] = []
    for path in sorted(queue_path.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        items.append(ReviewItem(**payload))

    return items


def mark_review_complete(
    item_id: str,
    queue_dir: str | Path,
    decision: str,
) -> None:
    """Mark a queued item as reviewed with the provided decision."""
    path = _queue_path(queue_dir, item_id)
    if not path.exists():
        raise FileNotFoundError(f"Review item does not exist: {path}")

    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["review_status"] = decision
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def _review_priority(
    source_entry: SourceRegistryEntry | None,
    weak_labels: WeakLabelResult,
    review_status: str | None,
) -> int:
    """Calculate a simple priority score for review ordering."""
    priority = 50

    if review_status in {"pending", "needs_review", None}:
        priority += 10

    if weak_labels.manufacturer and weak_labels.device_type:
        priority += 20
    elif weak_labels.manufacturer or weak_labels.device_type:
        priority += 10

    if weak_labels.confidence is not None:
        priority += int(weak_labels.confidence * 10)

    if source_entry is None:
        priority += 30
    elif source_entry.approval == SourceApproval.ALLOWED_TRAINING:
        priority += 5
    elif source_entry.approval == SourceApproval.ALLOWED_REVIEW_ONLY:
        priority += 15
    elif source_entry.approval == SourceApproval.ALLOWED_EMBEDDING_ONLY:
        priority += 10
    elif source_entry.approval == SourceApproval.BLOCKED:
        priority += 40

    return priority


def build_review_item(
    record: dict[str, Any],
    source_registry: dict[str, SourceRegistryEntry] | None = None,
    queue_name: str = "asset_review",
) -> ReviewItem:
    """Create a review queue item from a dataset record."""
    asset_id = str(
        record.get("asset_id")
        or record.get("image_id")
        or record.get("crop_id")
        or record.get("feedback_id")
        or f"review-{uuid.uuid4()}"
    )

    source_domain = normalize_domain(str(record.get("source_domain", "")))
    source_entry = source_registry.get(source_domain) if source_registry else None
    weak_labels = build_weak_labels(record)
    review_status = record.get("review_status")

    notes: list[str] = []
    if source_entry is None:
        notes.append("No source policy entry matched this record.")
    else:
        notes.append(f"Source approval: {source_entry.approval.value}")

    if weak_labels.manufacturer or weak_labels.device_type:
        notes.append("Weak labels available for reviewer triage.")

    metadata = {
        "source_domain": source_domain or None,
        "source_approval": source_entry.approval.value if source_entry else None,
        "weak_labels": to_serializable(weak_labels),
        "record": record,
    }

    return ReviewItem(
        item_id=f"{queue_name}-{asset_id}",
        asset_id=asset_id,
        queue_name=queue_name,
        priority=_review_priority(source_entry, weak_labels, review_status),
        review_status=str(review_status or "pending"),
        notes=" ".join(notes) if notes else None,
        metadata=metadata,
    )


def enqueue_record_for_review(
    record: dict[str, Any],
    queue_dir: str | Path,
    source_registry: dict[str, SourceRegistryEntry] | None = None,
    queue_name: str = "asset_review",
) -> Path:
    """Build and persist a review item from a dataset record."""
    item = build_review_item(record=record, source_registry=source_registry, queue_name=queue_name)
    return enqueue_review_item(item, queue_dir)
