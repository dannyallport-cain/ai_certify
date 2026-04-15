"""Placeholder OCR and logo fusion helpers.

This stage is intended to combine classifier outputs with OCR-derived brand
tokens and optional logo matches, especially for panels and wall devices.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class OcrSignal:
    """OCR-derived text signal for one crop or frame."""

    text: str
    confidence: float | None = None


@dataclass(slots=True)
class FusionResult:
    """Combined prediction result for a device crop."""

    manufacturer: str | None
    confidence: float | None
    evidence: dict[str, Any] | None = None


def combine_classifier_and_ocr(
    classifier_scores: dict[str, float],
    ocr_signal: OcrSignal | None,
) -> FusionResult:
    """Combine classifier outputs with OCR text hints."""
    raise NotImplementedError("OCR fusion is not implemented yet.")


def extract_brand_tokens(text: str) -> list[str]:
    """Extract candidate manufacturer tokens from OCR text."""
    raise NotImplementedError("Brand token extraction is not implemented yet.")