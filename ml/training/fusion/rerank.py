"""Placeholder utilities for server-side re-ranking of predictions.

Future implementations can combine detector, classifier, OCR, and metadata
signals to improve manufacturer ranking while preserving evidence trails.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class RerankCandidate:
    """One candidate label and its associated evidence."""

    label: str
    score: float
    evidence: dict[str, Any] | None = None


def rerank_manufacturer_candidates(
    candidates: list[RerankCandidate],
    context: dict[str, Any] | None = None,
) -> list[RerankCandidate]:
    """Re-rank manufacturer candidates using optional context."""
    raise NotImplementedError("Manufacturer re-ranking is not implemented yet.")


def select_top_candidate(candidates: list[RerankCandidate]) -> RerankCandidate | None:
    """Return the best candidate after re-ranking."""
    raise NotImplementedError("Top-candidate selection is not implemented yet.")