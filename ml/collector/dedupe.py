"""Duplicate inspection and grouping placeholders.

Near-duplicate handling is important for both compliance review and dataset
splits. This module only defines interfaces for future hashing and grouping.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class DuplicateCandidate:
    """Represents a possible duplicate pair or cluster member."""

    asset_id: str
    path: Path
    sha256: str | None = None
    phash: str | None = None


@dataclass(slots=True)
class DuplicateGroup:
    """Represents a duplicate cluster for human review or suppression."""

    group_id: str
    members: list[DuplicateCandidate]
    reason: str


def group_exact_duplicates(candidates: list[DuplicateCandidate]) -> list[DuplicateGroup]:
    """Group assets that share exact content hashes."""
    raise NotImplementedError("Exact duplicate grouping is not implemented yet.")


def group_near_duplicates(candidates: list[DuplicateCandidate]) -> list[DuplicateGroup]:
    """Group assets that appear visually similar."""
    raise NotImplementedError("Near-duplicate grouping is not implemented yet.")


def choose_canonical_asset(group: DuplicateGroup) -> DuplicateCandidate:
    """Select the canonical asset to keep in a duplicate group."""
    raise NotImplementedError("Canonical duplicate selection is not implemented yet.")