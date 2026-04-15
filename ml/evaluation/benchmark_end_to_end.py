"""Benchmark scaffolding for end-to-end RoomPlan ML quality.

This benchmark is intended to measure detection, manufacturer recognition,
duplicate rate, and user-correction-driven quality at the session level.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class EndToEndBenchmarkRequest:
    """Inputs for a session-level benchmark run."""

    session_dataset: Path
    output_dir: Path
    include_spatial_metrics: bool = True


def benchmark_end_to_end(request: EndToEndBenchmarkRequest) -> Path:
    """Run an end-to-end benchmark and persist a report."""
    raise NotImplementedError("End-to-end benchmarking is not implemented yet.")


def main() -> int:
    """CLI placeholder for end-to-end benchmarking."""
    raise NotImplementedError("End-to-end benchmark CLI is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())