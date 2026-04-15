"""PDF extraction placeholders for approved brochures and catalogs.

This module is reserved for conservative extraction of images, page metadata,
and OCR-ready text from locally saved PDFs whose source approval has already
been reviewed.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class ExtractedPdfPage:
    """Metadata describing one PDF page prepared for later processing."""

    pdf_path: Path
    page_number: int
    extracted_image_paths: list[Path]
    text_hint: str | None = None


def extract_pdf_pages(pdf_path: str | Path, output_dir: str | Path) -> list[ExtractedPdfPage]:
    """Extract page-level artifacts from a reviewed PDF."""
    raise NotImplementedError("PDF extraction is not implemented yet.")


def collect_pdf_text_hints(pages: list[ExtractedPdfPage]) -> dict[int, str]:
    """Build page-number to text-hint mappings for weak labeling."""
    raise NotImplementedError("PDF text hint extraction is not implemented yet.")


def main() -> int:
    """CLI placeholder for PDF extraction runs."""
    raise NotImplementedError("PDF extraction CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())