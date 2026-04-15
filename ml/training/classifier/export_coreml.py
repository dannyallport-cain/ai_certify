"""Placeholder Core ML export entry point for manufacturer classifiers."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class ClassifierExportRequest:
    """Inputs required to export a classifier to Core ML."""

    model_path: Path
    output_dir: Path
    quantize: bool = False


def export_classifier_to_coreml(request: ClassifierExportRequest) -> Path:
    """Convert a trained classifier artifact to Core ML."""
    raise NotImplementedError("Classifier Core ML export is not implemented yet.")


def main() -> int:
    """CLI placeholder for classifier Core ML export."""
    raise NotImplementedError("Classifier Core ML export CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())