"""Utility scaffolding for dataset split generation.

Split generation should avoid leaking near-duplicates across train,
validation, and test partitions. The exact strategy can later incorporate
site, source domain, model family, and capture session grouping.

This first implementation groups records conservatively by high-level keys
such as source domain, manufacturer, model, and capture/session identifiers
when present. Groups are then assigned to train/val/test partitions using a
stable seeded shuffle.
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class SplitGenerationRequest:
    """Inputs for generating dataset splits."""

    dataset_root: Path
    output_dir: Path
    seed: int = 0
    train_ratio: float = 0.7
    val_ratio: float = 0.15
    test_ratio: float = 0.15


def _iter_json_files(dataset_root: Path) -> list[Path]:
    """Return candidate dataset record files, excluding schema documents."""
    return sorted(
        path
        for path in dataset_root.rglob("*.json")
        if path.is_file() and "schemas" not in path.parts
    )


def _read_json(path: Path) -> dict[str, Any]:
    """Read a JSON object from disk."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return payload


def _record_identifier(payload: dict[str, Any], path: Path) -> str:
    """Return the best available record identifier."""
    for key in ("image_id", "crop_id", "asset_id", "feedback_id", "id"):
        if key in payload:
            return str(payload[key])
    return str(path)


def _group_key(payload: dict[str, Any], path: Path) -> str:
    """Create a conservative grouping key to reduce split leakage."""
    candidate_parts = [
        payload.get("session_id"),
        payload.get("parent_image_id"),
        payload.get("source_domain"),
        payload.get("manufacturer"),
        payload.get("model"),
        payload.get("site_id"),
        payload.get("capture_session_id"),
        path.parent.name,
    ]
    normalized = [str(part).strip() for part in candidate_parts if part not in (None, "", [])]
    return "::".join(normalized) if normalized else str(path.parent)


def _validate_ratios(request: SplitGenerationRequest) -> None:
    """Validate requested split ratios."""
    total = request.train_ratio + request.val_ratio + request.test_ratio
    if not 0.999 <= total <= 1.001:
        raise ValueError("train_ratio + val_ratio + test_ratio must sum to 1.0")

    for label, value in (
        ("train_ratio", request.train_ratio),
        ("val_ratio", request.val_ratio),
        ("test_ratio", request.test_ratio),
    ):
        if value < 0:
            raise ValueError(f"{label} must be non-negative")


def _assign_group_indices(
    group_count: int,
    train_ratio: float,
    val_ratio: float,
) -> tuple[int, int]:
    """Calculate upper-bound indices for train and validation partitions."""
    train_cutoff = int(round(group_count * train_ratio))
    val_cutoff = int(round(group_count * (train_ratio + val_ratio)))

    train_cutoff = max(0, min(group_count, train_cutoff))
    val_cutoff = max(train_cutoff, min(group_count, val_cutoff))
    return train_cutoff, val_cutoff


def generate_splits(request: SplitGenerationRequest) -> Path:
    """Generate split artifacts for downstream training and evaluation."""
    _validate_ratios(request)

    dataset_root = request.dataset_root.resolve()
    output_dir = request.output_dir.resolve()

    grouped_records: dict[str, list[dict[str, Any]]] = {}
    for path in _iter_json_files(dataset_root):
        payload = _read_json(path)
        record = {
            "id": _record_identifier(payload, path.relative_to(dataset_root)),
            "relative_path": str(path.relative_to(dataset_root)),
            "group_key": _group_key(payload, path.relative_to(dataset_root)),
        }
        grouped_records.setdefault(record["group_key"], []).append(record)

    group_keys = list(grouped_records.keys())
    random.Random(request.seed).shuffle(group_keys)

    train_cutoff, val_cutoff = _assign_group_indices(
        len(group_keys),
        train_ratio=request.train_ratio,
        val_ratio=request.val_ratio,
    )

    split_to_records: dict[str, list[dict[str, Any]]] = {"train": [], "val": [], "test": []}
    assignments: list[dict[str, Any]] = []

    for index, group_key in enumerate(group_keys):
        if index < train_cutoff:
            split = "train"
        elif index < val_cutoff:
            split = "val"
        else:
            split = "test"

        records = grouped_records[group_key]
        split_to_records[split].extend(records)
        assignments.append(
            {
                "group_key": group_key,
                "split": split,
                "record_count": len(records),
            }
        )

    payload = {
        "dataset_root": str(dataset_root),
        "seed": request.seed,
        "ratios": {
            "train": request.train_ratio,
            "val": request.val_ratio,
            "test": request.test_ratio,
        },
        "group_count": len(group_keys),
        "assignment_count": len(assignments),
        "split_counts": {split: len(records) for split, records in split_to_records.items()},
        "assignments": assignments,
        "records": split_to_records,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "splits.json"
    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return output_path


def _request_to_json_payload(request: SplitGenerationRequest) -> dict[str, Any]:
    """Convert request dataclass into a JSON-safe dictionary."""
    return {
        "dataset_root": str(request.dataset_root),
        "output_dir": str(request.output_dir),
        "seed": request.seed,
        "train_ratio": request.train_ratio,
        "val_ratio": request.val_ratio,
        "test_ratio": request.test_ratio,
    }


def main() -> int:
    """CLI for split generation."""
    parser = argparse.ArgumentParser(description="Generate train/val/test split assignments.")
    parser.add_argument("dataset_root", type=Path, help="Root directory containing dataset records.")
    parser.add_argument("output_dir", type=Path, help="Directory to write split artifacts into.")
    parser.add_argument("--seed", type=int, default=0, help="Seed used for stable shuffling.")
    parser.add_argument("--train-ratio", type=float, default=0.7, help="Training split ratio.")
    parser.add_argument("--val-ratio", type=float, default=0.15, help="Validation split ratio.")
    parser.add_argument("--test-ratio", type=float, default=0.15, help="Test split ratio.")
    args = parser.parse_args()

    request = SplitGenerationRequest(
        dataset_root=args.dataset_root,
        output_dir=args.output_dir,
        seed=args.seed,
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
    )
    output_path = generate_splits(request)
    print(json.dumps({"output_path": str(output_path), "request": _request_to_json_payload(request)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
