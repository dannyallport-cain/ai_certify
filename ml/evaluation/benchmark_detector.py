"""Benchmark scaffolding for coarse detector performance."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class DetectorBenchmarkRequest:
    """Inputs for a detector benchmark run."""

    model_path: Path
    dataset_config: Path
    output_dir: Path


def benchmark_detector(request: DetectorBenchmarkRequest) -> Path:
    """Run a detector benchmark and store a report artifact."""
    raise NotImplementedError("Detector benchmarking is not implemented yet.")


def main() -> int:
    """CLI placeholder for detector benchmarking."""
    raise NotImplementedError("Detector benchmark CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())