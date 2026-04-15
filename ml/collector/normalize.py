"""Normalization helpers for collected assets.

Normalization converts heterogeneous crawl and extraction outputs into the
shared dataset-ready records used by downstream review and training tools.
This implementation intentionally focuses on metadata normalization, not
binary image processing.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from ml.collector.weak_labels import build_weak_labels, to_serializable


PUBLIC_DEVICE_TYPES = (
    "panel",
    "sounder",
    "detector",
    "interface",
    "io_unit",
    "vad",
    "unknown",
)

LICENSE_STATUSES = (
    "allowed_training",
    "allowed_review_only",
    "allowed_embedding_only",
    "blocked",
)


@dataclass(slots=True)
class NormalizedAssetRecord:
    """Normalized asset metadata aligned to the dataset schema plan."""

    asset_id: str
    source_url: str
    source_domain: str
    license_status: str
    collected_at: str
    content_type: str
    sha256: str | None = None
    phash: str | None = None
    ocr_text: str | None = None
    weak_labels: dict[str, str | float | list[str] | None] | None = None
    review_status: str = "pending"
    metadata: dict[str, Any] | None = None


def _normalize_domain(value: str) -> str:
    """Normalize a source URL or domain string into a hostname."""
    candidate = value.strip().lower()
    if not candidate:
        return candidate

    if "://" in candidate:
        parsed = urlparse(candidate)
        candidate = parsed.netloc or parsed.path

    if candidate.startswith("www."):
        candidate = candidate[4:]

    return candidate.rstrip("/")


def _first_present(raw_record: dict[str, Any], *keys: str) -> Any:
    """Return the first non-empty value among the provided keys."""
    for key in keys:
        value = raw_record.get(key)
        if value not in (None, "", []):
            return value
    return None


def _default_collected_at(raw_record: dict[str, Any]) -> str:
    """Resolve a collection timestamp or provide a UTC fallback."""
    value = _first_present(raw_record, "collected_at", "captured_at", "created_at")
    if value:
        return str(value)
    return datetime.now(UTC).isoformat()


def _default_asset_id(raw_record: dict[str, Any]) -> str:
    """Resolve an asset identifier or mint one."""
    value = _first_present(raw_record, "asset_id", "id", "record_id")
    if value:
        return str(value)
    return f"asset-{uuid.uuid4()}"


def _default_license_status(raw_record: dict[str, Any]) -> str:
    """Resolve a conservative license status value."""
    value = str(
        _first_present(raw_record, "license_status", "source_approval", "approval_status")
        or "allowed_review_only"
    )
    if value not in LICENSE_STATUSES:
        return "allowed_review_only"
    return value


def _default_content_type(raw_record: dict[str, Any]) -> str:
    """Resolve a content type or use a safe fallback."""
    value = _first_present(raw_record, "content_type", "mime_type")
    if value:
        return str(value)
    return "application/octet-stream"


def normalize_asset_record(raw_record: dict[str, Any]) -> NormalizedAssetRecord:
    """Convert a raw collector record into a normalized asset record."""
    source_url = str(_first_present(raw_record, "source_url", "url") or "").strip()
    source_domain = str(_first_present(raw_record, "source_domain", "domain") or "").strip()

    if not source_url and not source_domain:
        raise ValueError("normalize_asset_record requires at least source_url or source_domain")

    normalized_source_domain = _normalize_domain(source_domain or source_url)
    weak_label_result = build_weak_labels(raw_record)

    metadata = {
        "title": _first_present(raw_record, "title", "page_title"),
        "filename": _first_present(raw_record, "filename", "path"),
        "description": raw_record.get("description"),
        "notes": raw_record.get("notes"),
    }
    metadata = {key: value for key, value in metadata.items() if value not in (None, "", [])} or None

    device_type = None
    weak_labels = to_serializable(weak_label_result)
    if isinstance(weak_labels, dict):
        candidate_type = weak_labels.get("device_type")
        if isinstance(candidate_type, str) and validate_public_device_type(candidate_type):
            device_type = candidate_type
        elif candidate_type is not None:
            weak_labels["device_type"] = "unknown"
            device_type = "unknown"

    if metadata is None:
        metadata = {}
    if device_type:
        metadata["public_device_type"] = device_type

    return NormalizedAssetRecord(
        asset_id=_default_asset_id(raw_record),
        source_url=source_url or normalized_source_domain,
        source_domain=normalized_source_domain,
        license_status=_default_license_status(raw_record),
        collected_at=_default_collected_at(raw_record),
        content_type=_default_content_type(raw_record),
        sha256=_first_present(raw_record, "sha256"),
        phash=_first_present(raw_record, "phash"),
        ocr_text=_first_present(raw_record, "ocr_text"),
        weak_labels=weak_labels,
        review_status=str(_first_present(raw_record, "review_status") or "pending"),
        metadata=metadata,
    )


def validate_public_device_type(device_type: str) -> bool:
    """Return whether a type is allowed by the coarse public module contract."""
    normalized = device_type.strip().lower()
    return any(value == normalized for value in PUBLIC_DEVICE_TYPES)


def write_normalized_asset(record: NormalizedAssetRecord, output_dir: str | Path) -> Path:
    """Persist one normalized asset record for later indexing."""
    output_path = Path(output_dir) / f"{record.asset_id}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(asdict(record), indent=2, sort_keys=True), encoding="utf-8")
    return output_path
