"""Starter interfaces for the ML data collector pipeline.

This package provides conservative scaffolding for bootstrap-only source
collection and review workflows used by the Fire Alarm RoomPlan ML workspace.

The modules in this package intentionally avoid implementing scraping or ML
logic. They define shared data structures and function signatures so later
work can add approved-source collection, extraction, normalization, dedupe,
weak labeling, and human review steps.
"""

from .source_registry import ManufacturerSource, SourceApproval, SourceRegistryEntry

__all__ = [
    "ManufacturerSource",
    "SourceApproval",
    "SourceRegistryEntry",
]