"""Source registry helpers for approved and blocked collection inputs.

The implementation here is intentionally lightweight but functional. It can:

- load approved/blocked source policy files from YAML
- normalize source status values into ``SourceApproval``
- validate registry entries against the repository policy contract
- build domain-indexed lookups for downstream collection tooling
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml


class SourceApproval(str, Enum):
    """Conservative source approval states aligned with the implementation plan."""

    ALLOWED_TRAINING = "allowed_training"
    ALLOWED_REVIEW_ONLY = "allowed_review_only"
    ALLOWED_EMBEDDING_ONLY = "allowed_embedding_only"
    BLOCKED = "blocked"


@dataclass(slots=True)
class ManufacturerSource:
    """Represents a manufacturer or distributor source domain."""

    name: str
    domain: str
    source_type: str
    notes: str | None = None


@dataclass(slots=True)
class SourceRegistryEntry:
    """A single source policy record loaded from configuration."""

    domain: str
    source_type: str
    approval: SourceApproval
    robots_status: str | None = None
    copyright_note: str | None = None
    terms_reviewed_by: str | None = None
    training_approval: bool = False
    rate_limit_policy: str | None = None
    notes: str | None = None
    manufacturers: list[str] = field(default_factory=list)
    source_id: str | None = None
    source_name: str | None = None
    config_path: str | None = None

    @property
    def normalized_domain(self) -> str:
        """Return a normalized domain for indexing and lookups."""
        return normalize_domain(self.domain)


def normalize_domain(value: str) -> str:
    """Normalize a domain or URL-like string to a lower-case hostname."""
    candidate = value.strip().lower()
    if not candidate:
      return candidate

    if "://" in candidate:
        parsed = urlparse(candidate)
        candidate = parsed.netloc or parsed.path

    if candidate.startswith("www."):
        candidate = candidate[4:]

    return candidate.rstrip("/")


def _parse_training_approval(value: Any) -> bool:
    """Convert training approval field variants into a strict boolean."""
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        normalized = value.strip().lower()
        return normalized in {"true", "yes", "approved", "allowed_training"}

    return False


def _parse_approval(raw_source: dict[str, Any]) -> SourceApproval:
    """Resolve registry approval from status/approval fields."""
    raw_value = raw_source.get("approval", raw_source.get("status", SourceApproval.BLOCKED.value))
    try:
        return SourceApproval(str(raw_value))
    except ValueError as error:
        raise ValueError(f"Unsupported source approval value: {raw_value!r}") from error


def _coerce_source_entry(raw_source: dict[str, Any], config_path: Path) -> SourceRegistryEntry:
    """Convert a raw YAML source block into a typed registry entry."""
    manufacturers = raw_source.get("manufacturers", [])
    if manufacturers is None:
        manufacturers = []

    if not isinstance(manufacturers, list):
        raise ValueError(
            f"Expected 'manufacturers' to be a list for source {raw_source.get('id') or raw_source.get('domain')!r}."
        )

    return SourceRegistryEntry(
        domain=normalize_domain(str(raw_source.get("domain", ""))),
        source_type=str(raw_source.get("source_type", "")).strip(),
        approval=_parse_approval(raw_source),
        robots_status=_string_or_none(raw_source.get("robots_status")),
        copyright_note=_string_or_none(raw_source.get("copyright_note")),
        terms_reviewed_by=_string_or_none(raw_source.get("terms_reviewed_by")),
        training_approval=_parse_training_approval(raw_source.get("training_approval")),
        rate_limit_policy=_string_or_none(raw_source.get("rate_limit_policy")),
        notes=_string_or_none(raw_source.get("notes")),
        manufacturers=[str(item).strip() for item in manufacturers if str(item).strip()],
        source_id=_string_or_none(raw_source.get("id")),
        source_name=_string_or_none(raw_source.get("name")),
        config_path=str(config_path),
    )


def _string_or_none(value: Any) -> str | None:
    """Return a stripped string value or ``None``."""
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def load_source_registry(config_path: str | Path) -> list[SourceRegistryEntry]:
    """Load registry entries from a YAML config file."""
    path = Path(config_path)
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}

    if not isinstance(raw, dict):
        raise ValueError(f"Expected registry file {path} to contain a mapping at the root.")

    sources = raw.get("sources", [])
    if not isinstance(sources, list):
        raise ValueError(f"Expected registry file {path} to define 'sources' as a list.")

    entries = [_coerce_source_entry(source, path) for source in sources]
    return entries


def index_registry_by_domain(
    entries: list[SourceRegistryEntry],
) -> dict[str, SourceRegistryEntry]:
    """Build a domain-indexed lookup for later collector stages.

    More specific duplicate entries replace earlier ones. This lets a blocked
    override file intentionally replace an earlier review-only entry.
    """
    indexed: dict[str, SourceRegistryEntry] = {}
    for entry in entries:
        indexed[entry.normalized_domain] = entry
    return indexed


def resolve_source_approval(
    domain: str,
    registry: dict[str, SourceRegistryEntry],
) -> SourceApproval | None:
    """Resolve the configured approval status for a domain."""
    normalized = normalize_domain(domain)
    entry = registry.get(normalized)
    return entry.approval if entry else None


def validate_registry_entry(entry: SourceRegistryEntry) -> list[str]:
    """Return human-readable validation issues for a registry entry."""
    issues: list[str] = []

    if not entry.normalized_domain:
        issues.append("domain is required")

    if not entry.source_type:
        issues.append("source_type is required")

    if entry.approval != SourceApproval.BLOCKED:
        if not entry.robots_status:
            issues.append("robots_status is required for non-blocked sources")
        if not entry.copyright_note:
            issues.append("copyright_note is required for non-blocked sources")
        if not entry.rate_limit_policy:
            issues.append("rate_limit_policy is required for non-blocked sources")

    if entry.approval == SourceApproval.ALLOWED_TRAINING and not entry.training_approval:
        issues.append("allowed_training sources must have training_approval=true")

    if entry.approval == SourceApproval.BLOCKED and entry.training_approval:
        issues.append("blocked sources cannot have training_approval=true")

    return issues


def to_serializable(entry: SourceRegistryEntry) -> dict[str, Any]:
    """Convert a registry entry to a plain serializable mapping."""
    payload = asdict(entry)
    payload["approval"] = entry.approval.value
    payload["domain"] = entry.normalized_domain
    return payload
