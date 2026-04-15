"""Placeholder evaluation entry point for the detector model."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class DetectorEvaluationRequest:
    """Inputs required to evaluate a trained detector."""

    model_path: Path
    dataset_config: Path
    split: str
    output_dir: Path


def evaluate_detector(request: DetectorEvaluationRequest) -> Path:
    """Run detector evaluation and write metrics artifacts."""
    raise NotImplementedError("Detector evaluation is not implemented yet.")


def summarize_detector_metrics(metrics_path: str | Path) -> dict[str, float]:
    """Load and summarize detector metrics for reporting."""
    raise NotImplementedError("Detector metric summarization is not implemented yet.")


def main() -> int:
    """CLI placeholder for detector evaluation."""
    raise NotImplementedError("Detector evaluation CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())