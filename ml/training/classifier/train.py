"""Starter entry point for manufacturer classifier training.

The initial manufacturer shortlist should stay aligned with the RoomPlan plan
and include an explicit Unknown class.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class ClassifierTrainingConfig:
    """Resolved configuration for classifier training."""

    dataset_config: Path
    training_config: Path
    output_dir: Path
    run_name: str


def load_training_config(config_path: str | Path) -> dict[str, Any]:
    """Load classifier training configuration from disk."""
    raise NotImplementedError("Classifier config loading is not implemented yet.")


def train_classifier(config: ClassifierTrainingConfig) -> Path:
    """Run manufacturer classifier training and return artifact output."""
    raise NotImplementedError("Classifier training is not implemented yet.")


def main() -> int:
    """CLI placeholder for classifier training."""
    raise NotImplementedError("Classifier training CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())