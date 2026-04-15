"""HTML asset extraction placeholders for approved source pages.

Later implementations should parse saved HTML pages and emit candidate assets,
OCR hints, and weak labels. Unclear-license sources must never be marked as
training-approved by default.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class ExtractedHtmlAsset:
    """A candidate asset discovered in a saved HTML page."""

    source_page: Path
    asset_url: str
    alt_text: str | None = None
    surrounding_text: str | None = None


def extract_asset_links(html_path: str | Path) -> list[ExtractedHtmlAsset]:
    """Extract image and document references from one saved HTML file."""
    raise NotImplementedError("HTML asset link extraction is not implemented yet.")


def infer_weak_labels(asset: ExtractedHtmlAsset) -> dict[str, str | None]:
    """Infer bootstrap weak labels from nearby page text."""
    raise NotImplementedError("HTML weak label inference is not implemented yet.")


def main() -> int:
    """CLI placeholder for extracting candidate assets from saved HTML."""
    raise NotImplementedError("HTML extraction CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())