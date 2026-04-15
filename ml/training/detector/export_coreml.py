"""Placeholder Core ML export entry point for detector models.

Later work should convert an approved trained detector artifact into a Core ML
bundle suitable for integration into the iOS RoomPlan module.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class DetectorExportRequest:
    """Inputs required to export a detector to Core ML."""

    model_path: Path
    output_dir: Path
    quantize: bool = False


def export_detector_to_coreml(request: DetectorExportRequest) -> Path:
    """Convert a trained detector model to a Core ML artifact."""
    raise NotImplementedError("Detector Core ML export is not implemented yet.")


def main() -> int:
    """CLI placeholder for detector Core ML export."""
    raise NotImplementedError("Detector Core ML export CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())