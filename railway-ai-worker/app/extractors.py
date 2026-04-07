from __future__ import annotations

import re
from typing import Any

KNOWN_BRANDS = {
    "schneider electric": "Schneider Electric",
    "schneider": "Schneider Electric",
    "square d": "Square D",
    "hager": "Hager",
    "wylex": "Wylex",
    "contactum": "Contactum",
    "crabtree": "Crabtree",
    "abb": "ABB",
    "siemens": "Siemens",
    "legrand": "Legrand",
    "eaton": "Eaton",
    "mem": "MEM",
    "gewiss": "Gewiss",
    "fusebox": "FuseBox",
    "proteus": "Proteus",
    "verso": "Verso",
    "lewden": "Lewden",
    "chint": "Chint",
    "bg electrical": "BG",
    "scolmore": "Scolmore",
    "mk": "MK",
}

BOARD_TYPE_KEYWORDS = {
    "split load": "split-load",
    "split-load": "split-load",
    "dual rcd": "dual-rcd",
    "high integrity": "high-integrity",
    "garage consumer unit": "garage-unit",
    "garage unit": "garage-unit",
    "main switch": "main-switch",
    "all rcbo": "rcbo-board",
    "rcbo": "rcbo-board",
}

MODEL_PATTERNS = [
    re.compile(r"\b(?:model|type|cat(?:alog)?(?:\s*no)?|ref(?:erence)?|part\s*no)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})\b", re.IGNORECASE),
    re.compile(r"\b([A-Z]{1,5}\d{2,}[A-Z0-9\-\/]{0,12})\b"),
]

SERIAL_PATTERNS = [
    re.compile(r"\b(?:serial(?:\s*(?:number|no))?|s\/n|sn)\s*[:#-]?\s*([A-Z0-9\-]{5,})\b", re.IGNORECASE),
    re.compile(r"\b([A-Z]{1,4}\d{5,}[A-Z0-9\-]{0,8})\b"),
]


def _normalize_text(line: str) -> str:
    return re.sub(r"\s+", " ", (line or "").strip())


def _clean_lines(lines: list[str]) -> list[str]:
    return [_normalize_text(line) for line in lines if _normalize_text(line)]


def _lower_lines(lines: list[str]) -> list[str]:
    return [line.lower() for line in _clean_lines(lines)]


def _unique_preserve(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        item = value.strip()
        if not item:
            continue
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def extract_brand(lines: list[str]) -> str | None:
    joined = "\n".join(_lower_lines(lines))
    for keyword, label in KNOWN_BRANDS.items():
        if keyword in joined:
            return label
    return None


def extract_model_candidates(lines: list[str]) -> list[str]:
    candidates: list[str] = []
    for line in _clean_lines(lines):
        for pattern in MODEL_PATTERNS:
            for match in pattern.findall(line):
                value = match if isinstance(match, str) else match[0]
                value = value.upper().strip(" -:#")
                if len(value) >= 3 and not value.isdigit():
                    candidates.append(value)
    return _unique_preserve(candidates)[:5]


def _looks_like_serial(value: str) -> bool:
    if len(value) < 5:
        return False
    if re.fullmatch(r"\d+", value):
        return len(value) >= 8
    return bool(re.search(r"[A-Z]", value) and re.search(r"\d", value))


def extract_serial_candidates(lines: list[str]) -> list[str]:
    candidates: list[str] = []
    for line in _clean_lines(lines):
        for pattern in SERIAL_PATTERNS:
            for match in pattern.findall(line):
                value = match if isinstance(match, str) else match[0]
                value = value.upper().strip(" -:#")
                if _looks_like_serial(value):
                    candidates.append(value)
    return _unique_preserve(candidates)[:5]


def _keyword_flag(lines: list[str], include: list[str], exclude: list[str] | None = None) -> bool:
    exclude = exclude or []
    for line in _lower_lines(lines):
        if any(token in line for token in include) and not any(token in line for token in exclude):
            return True
    return False


def extract_device_hints(lines: list[str]) -> dict[str, bool]:
    return {
        "hasSPDHint": _keyword_flag(lines, ["spd", "surge protection", "surge device"]),
        "hasRCDHint": _keyword_flag(lines, ["rcd", "residual current device"], ["rcbo"]),
        "hasRCBOHint": _keyword_flag(lines, ["rcbo"]),
        "hasMCBHint": _keyword_flag(lines, ["mcb", "miniature circuit breaker", "type b", "type c"]),
        "hasMainSwitchHint": _keyword_flag(lines, ["main switch", "isolator", "switch disconnector"]),
    }


def extract_board_type_hint(lines: list[str], device_hints: dict[str, bool] | None = None) -> str | None:
    joined = "\n".join(_lower_lines(lines))
    for keyword, board_type in BOARD_TYPE_KEYWORDS.items():
        if keyword in joined:
            return board_type

    hints = device_hints or extract_device_hints(lines)
    if hints.get("hasRCBOHint"):
        return "rcbo-board"
    if hints.get("hasRCDHint") and hints.get("hasMCBHint"):
        return "split-load"
    if hints.get("hasMainSwitchHint") and hints.get("hasMCBHint"):
        return "main-switch"
    return None


def image_quality_review_notes(image_quality: dict[str, Any] | None) -> list[str]:
    if not image_quality:
        return []

    notes: list[str] = []
    status = str(image_quality.get("status") or "").lower()
    width = int(image_quality.get("width") or 0)
    height = int(image_quality.get("height") or 0)

    if status in {"poor", "low", "unavailable"}:
        notes.append("OCR image quality flagged as poor.")
    if image_quality.get("isLowContrast"):
        notes.append("Image appears low contrast for reliable OCR.")
    if image_quality.get("isBlurry"):
        notes.append("Image appears blurry for reliable OCR.")
    if image_quality.get("isDark"):
        notes.append("Image appears dark for reliable OCR.")
    if width and height and max(width, height) < 800:
        notes.append("Image resolution may be too small for reliable OCR.")

    return _unique_preserve(notes)


def build_observations(lines: list[str], image_quality: dict[str, Any] | None = None) -> list[str]:
    lowered = _lower_lines(lines)
    observations: list[str] = []

    if any("label" in line and "missing" in line for line in lowered):
        observations.append("Possible missing circuit labeling mentioned in OCR text.")
    if any(token in line for line in lowered for token in ["damage", "burn", "scorch", "overheat"]):
        observations.append("Potential damage-related wording detected in OCR text.")
    if any("type a" in line for line in lowered):
        observations.append("Type A marking detected.")
    if any("type ac" in line for line in lowered):
        observations.append("Type AC marking detected.")
    if any("spd" in line or "surge protection" in line for line in lowered):
        observations.append("Surge protection wording detected.")
    if any("rcbo" in line for line in lowered):
        observations.append("RCBO wording detected.")
    if any("rcd" in line for line in lowered):
        observations.append("RCD wording detected.")

    observations.extend(image_quality_review_notes(image_quality))
    return _unique_preserve(observations)


def build_review_notes(lines: list[str], image_quality: dict[str, Any] | None = None) -> list[str]:
    notes: list[str] = []

    if not extract_brand(lines):
        notes.append("Brand was not confidently identified from OCR text.")
    if not extract_model_candidates(lines):
        notes.append("No clear model candidate was found from OCR text.")
    if not extract_serial_candidates(lines):
        notes.append("No clear serial number candidate was found from OCR text.")
    if not any(extract_device_hints(lines).values()):
        notes.append("Protective device types were not confidently detected from OCR text.")

    notes.extend(image_quality_review_notes(image_quality))
    return _unique_preserve(notes)


def extract_consumer_unit_hints(lines: list[str], image_quality: dict[str, Any] | None = None) -> dict[str, Any]:
    device_hints = extract_device_hints(lines)
    model_candidates = extract_model_candidates(lines)
    serial_candidates = extract_serial_candidates(lines)

    return {
        "brand": extract_brand(lines),
        "model": model_candidates[0] if model_candidates else None,
        "modelCandidates": model_candidates,
        "serialNumber": serial_candidates[0] if serial_candidates else None,
        "serialNumberCandidates": serial_candidates,
        "boardTypeHint": extract_board_type_hint(lines, device_hints=device_hints),
        **device_hints,
        "reviewNotes": build_review_notes(lines, image_quality=image_quality),
        "observations": build_observations(lines, image_quality=image_quality),
    }


def build_text_detections(text_lines: list[str]) -> list[str]:
    return _unique_preserve(_clean_lines(text_lines))


def build_image_quality_summary(image_quality: dict[str, Any] | None) -> str:
    if not image_quality:
        return "unknown"
    status = str(image_quality.get("status") or "unknown").lower()
    line_count = int(image_quality.get("lineCount") or 0)
    return f"{status} ({line_count} text lines)"


def build_report_sections(
    hints: dict[str, Any],
    text_lines: list[str],
    requested_sections: list[str] | None = None,
) -> dict[str, Any]:
    requested = {item for item in (requested_sections or []) if item}

    sections: dict[str, Any] = {
        "analysisStatus": "ocr-rules",
        "consumerUnitIdentification": {
            "brand": hints.get("brand"),
            "model": hints.get("model"),
            "serialNumber": hints.get("serialNumber"),
            "boardType": hints.get("boardTypeHint"),
        },
        "protectiveDevices": {
            "hasSPD": bool(hints.get("hasSPDHint")),
            "hasRCD": bool(hints.get("hasRCDHint")),
            "hasRCBO": bool(hints.get("hasRCBOHint")),
            "hasMCB": bool(hints.get("hasMCBHint")),
            "hasMainSwitch": bool(hints.get("hasMainSwitchHint")),
        },
        "observations": hints.get("observations") or [],
        "reviewNotes": hints.get("reviewNotes") or [],
    }

    if not requested or "ocrText" in requested:
        sections["ocrText"] = build_text_detections(text_lines)[:50]

    return sections


__all__ = [
    "build_image_quality_summary",
    "build_observations",
    "build_report_sections",
    "build_review_notes",
    "build_text_detections",
    "extract_board_type_hint",
    "extract_brand",
    "extract_consumer_unit_hints",
    "extract_device_hints",
    "extract_model_candidates",
    "extract_serial_candidates",
    "image_quality_review_notes",
]
