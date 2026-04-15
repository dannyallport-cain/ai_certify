"""Starter entry point for coarse fire alarm device detector training.

The first detector should target the coarse public device classes defined in
the RoomPlan plan: panel, sounder, detector, interface, io_unit, and vad.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class DetectorTrainingConfig:
    """Resolved detector training configuration."""

    dataset_config: Path
    training_config: Path
    output_dir: Path
    run_name: str


def load_training_config(config_path: str | Path) -> dict[str, Any]:
    """Load detector training configuration from disk."""
    raise NotImplementedError("Detector config loading is not implemented yet.")


def train_detector(config: DetectorTrainingConfig) -> Path:
    """Run detector training and return the output artifact directory."""
    raise NotImplementedError("Detector training is not implemented yet.")


def main() -> int:
    """CLI placeholder for detector training."""
    raise NotImplementedError("Detector training CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())