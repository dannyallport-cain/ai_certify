"""Placeholder evaluation entry point for manufacturer classifiers."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class ClassifierEvaluationRequest:
    """Inputs required to evaluate a trained manufacturer classifier."""

    model_path: Path
    dataset_config: Path
    split: str
    output_dir: Path


def evaluate_classifier(request: ClassifierEvaluationRequest) -> Path:
    """Run classifier evaluation and persist metrics outputs."""
    raise NotImplementedError("Classifier evaluation is not implemented yet.")


def summarize_classifier_metrics(metrics_path: str | Path) -> dict[str, float]:
    """Load and summarize classifier metrics for reporting."""
    raise NotImplementedError("Classifier metric summarization is not implemented yet.")


def main() -> int:
    """CLI placeholder for classifier evaluation."""
    raise NotImplementedError("Classifier evaluation CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())