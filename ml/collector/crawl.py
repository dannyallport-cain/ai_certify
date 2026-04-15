"""Bootstrap-only crawling entry points for approved web sources.

This module should eventually coordinate fetching source pages while respecting
source approvals, robots constraints, and conservative rate limits. It is a
placeholder only and intentionally does not implement network access.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .source_registry import SourceRegistryEntry


@dataclass(slots=True)
class CrawlRequest:
    """Description of a crawl run for one approved domain or seed list."""

    domain: str
    output_dir: Path
    max_pages: int = 0
    include_pdfs: bool = True
    include_images: bool = True


@dataclass(slots=True)
class CrawlResult:
    """Summary of crawl outputs for later extraction stages."""

    domain: str
    discovered_urls: list[str]
    saved_files: list[Path]
    skipped_urls: list[str]


def build_seed_urls(entry: SourceRegistryEntry) -> list[str]:
    """Return seed URLs for an approved registry entry."""
    raise NotImplementedError("Seed URL generation is not implemented yet.")


def crawl_approved_source(
    request: CrawlRequest,
    entry: SourceRegistryEntry,
) -> CrawlResult:
    """Crawl one approved source using the registry policy."""
    raise NotImplementedError("Approved-source crawling is not implemented yet.")


def save_crawl_manifest(result: CrawlResult, destination: Path) -> Path:
    """Persist a crawl manifest for reproducibility and later review."""
    raise NotImplementedError("Crawl manifest writing is not implemented yet.")


def main() -> int:
    """CLI placeholder for running the approved-source crawler."""
    raise NotImplementedError("Crawler CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())