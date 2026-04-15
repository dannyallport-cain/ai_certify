"""Weak-label generation helpers for bootstrap datasets.

Weak labels remain provisional and should only be used for triage,
prioritization, and review queue seeding. They are not a substitute for
human-reviewed annotations.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


MANUFACTURER_SHORTLIST = (
    "Apollo",
    "Hochiki",
    "Gent",
    "Advanced",
    "Morley",
    "Notifier",
    "Kentec",
    "C-Tec",
    "Siemens",
    "Eaton",
    "Hyfire",
    "System Sensor",
    "Unknown",
)

PUBLIC_DEVICE_TYPES = (
    "panel",
    "sounder",
    "detector",
    "interface",
    "io_unit",
    "vad",
    "unknown",
)

MANUFACTURER_ALIASES: dict[str, str] = {
    "apollo": "Apollo",
    "apollo fire": "Apollo",
    "hochiki": "Hochiki",
    "gent": "Gent",
    "advanced": "Advanced",
    "morley": "Morley",
    "morley-ias": "Morley",
    "notifier": "Notifier",
    "kentec": "Kentec",
    "c-tec": "C-Tec",
    "ctec": "C-Tec",
    "siemens": "Siemens",
    "eaton": "Eaton",
    "hyfire": "Hyfire",
    "system sensor": "System Sensor",
    "systemsensor": "System Sensor",
}

DEVICE_TYPE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "panel": ("panel", "control panel", "fire panel", "facp"),
    "sounder": ("sounder", "horn", "siren", "base sounder"),
    "detector": (
        "detector",
        "smoke detector",
        "heat detector",
        "multisensor",
        "multi-sensor",
        "optical detector",
        "sensor",
    ),
    "interface": ("interface", "relay interface", "input module", "monitor module"),
    "io_unit": ("i/o", "io unit", "input output", "control module", "zone monitor"),
    "vad": ("vad", "visual alarm", "visual alarm device", "beacon", "strobe", "sounder beacon"),
}

SUBTYPE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "smoke": ("smoke detector", "optical detector", "optical smoke"),
    "heat": ("heat detector",),
    "multi-sensor": ("multisensor", "multi-sensor"),
    "beam": ("beam detector",),
    "aspirating": ("aspirating", "air sampling"),
    "wall sounder": ("wall sounder",),
    "base sounder": ("base sounder",),
    "sounder-beacon": ("sounder beacon", "sounder-beacon"),
    "wall vad": ("wall vad",),
    "ceiling vad": ("ceiling vad",),
    "relay interface": ("relay interface",),
    "input module": ("input module", "monitor module"),
    "control module": ("control module",),
    "zone monitor": ("zone monitor",),
}


@dataclass(slots=True)
class WeakLabelResult:
    """Weak labels inferred from text, filenames, or source metadata."""

    manufacturer: str | None
    device_type: str | None
    subtype: str | None = None
    confidence: float | None = None
    evidence: list[str] | None = None


def _normalize_text(value: str) -> str:
    """Normalize free text for keyword matching."""
    return " ".join(value.lower().replace("_", " ").replace("-", " ").split())


def infer_manufacturer(text: str) -> str | None:
    """Infer a shortlist manufacturer label from free text."""
    normalized = _normalize_text(text)
    for alias, canonical in MANUFACTURER_ALIASES.items():
        if alias in normalized:
            return canonical
    return None


def infer_device_type(text: str) -> str | None:
    """Infer a coarse public device type from free text."""
    normalized = _normalize_text(text)
    for device_type, keywords in DEVICE_TYPE_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return device_type
    return None


def infer_subtype(text: str) -> str | None:
    """Infer a subtype hint from free text."""
    normalized = _normalize_text(text)
    for subtype, keywords in SUBTYPE_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return subtype
    return None


def _collect_candidate_text(record: dict[str, Any]) -> list[str]:
    """Collect strings from common asset metadata fields."""
    fields = (
        "source_url",
        "source_domain",
        "page_title",
        "title",
        "alt_text",
        "caption",
        "filename",
        "path",
        "ocr_text",
        "description",
        "notes",
    )

    parts: list[str] = []
    for field in fields:
        value = record.get(field)
        if value:
            parts.append(str(value))

    weak_labels = record.get("weak_labels")
    if isinstance(weak_labels, dict):
        for value in weak_labels.values():
            if value:
                parts.append(str(value))

    return parts


def build_weak_labels(record: dict[str, Any]) -> WeakLabelResult:
    """Generate a provisional weak-label bundle for a collected asset."""
    text_parts = _collect_candidate_text(record)
    combined_text = " | ".join(text_parts)

    evidence: list[str] = []
    manufacturer = infer_manufacturer(combined_text)
    if manufacturer:
        evidence.append(f"manufacturer:{manufacturer}")

    device_type = infer_device_type(combined_text)
    if device_type:
        evidence.append(f"device_type:{device_type}")

    subtype = infer_subtype(combined_text)
    if subtype:
        evidence.append(f"subtype:{subtype}")

    confidence = None
    matches = sum(value is not None for value in (manufacturer, device_type, subtype))
    if matches == 3:
        confidence = 0.8
    elif matches == 2:
        confidence = 0.65
    elif matches == 1:
        confidence = 0.5

    return WeakLabelResult(
        manufacturer=manufacturer,
        device_type=device_type,
        subtype=subtype,
        confidence=confidence,
        evidence=evidence or None,
    )


def is_supported_manufacturer(name: str) -> bool:
    """Return whether a manufacturer matches the initial shortlist."""
    normalized = name.strip().lower()
    return any(item.lower() == normalized for item in MANUFACTURER_SHORTLIST)


def is_supported_device_type(name: str) -> bool:
    """Return whether a type matches the public coarse device classes."""
    normalized = name.strip().lower()
    return any(item.lower() == normalized for item in PUBLIC_DEVICE_TYPES)


def to_serializable(result: WeakLabelResult) -> dict[str, Any]:
    """Convert a weak-label result into a plain mapping."""
    return asdict(result)
