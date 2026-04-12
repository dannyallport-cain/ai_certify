from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

RULES_DIR = Path(__file__).resolve().parent
DEFAULT_RULE_PACK = "v1_0_eicr_consumer_unit.json"
DEFAULT_RULE_PACKS = (
    DEFAULT_RULE_PACK,
    "v1_1_standards_compiled.json",
    "v1_2_bs7671_domain.json",
    "v1_2_gn3_domain.json",
    "v1_2_eicr_coding_domain.json",
    "v1_2_image_observation_domain.json",
    "v1_3_certificate_validation_domain.json",
    "v1_4_structured_certificate_validation_domain.json",
)
SUPPORTED_OPERATORS = {"eq", "neq", "contains", "not_contains", "exists", "in"}


def _get_by_path(data: dict[str, Any], path: str) -> Any:
    current: Any = data
    for part in path.split("."):
        if isinstance(current, dict):
            if part not in current:
                return None
            current = current.get(part)
            continue
        if isinstance(current, list):
            try:
                index = int(part)
            except ValueError:
                return None
            if index < 0 or index >= len(current):
                return None
            current = current[index]
            continue
        return None
    return current


def _exists_value(value: Any) -> bool:
    return value is not None and value != "" and value != [] and value != {}


def _normalize_for_contains(value: Any) -> str:
    if isinstance(value, list):
        return " ".join(str(item) for item in value).lower()
    return str(value or "").lower()


def _coerce_expected(condition: dict[str, Any], context: dict[str, Any]) -> Any:
    if "valueFrom" in condition:
        return _get_by_path(context, str(condition["valueFrom"]))
    return condition.get("value")


def _evaluate_condition(condition: dict[str, Any], context: dict[str, Any]) -> bool:
    operator = str(condition.get("op") or "").strip()
    if operator not in SUPPORTED_OPERATORS:
        return False

    path = str(condition.get("path") or "").strip()
    actual = _get_by_path(context, path)

    if operator == "exists":
        return _exists_value(actual)

    expected = _coerce_expected(condition, context)

    if operator == "eq":
        return actual == expected
    if operator == "neq":
        return _exists_value(actual) and _exists_value(expected) and actual != expected
    if operator == "contains":
        return str(expected or "").lower() in _normalize_for_contains(actual)
    if operator == "not_contains":
        return str(expected or "").lower() not in _normalize_for_contains(actual)
    if operator == "in":
        if not isinstance(expected, list):
            return False
        return actual in expected

    return False


def _evaluate_group(group: dict[str, Any], context: dict[str, Any]) -> bool:
    if "all" in group:
        items = group.get("all") or []
        return bool(items) and all(_evaluate_entry(item, context) for item in items)
    if "any" in group:
        items = group.get("any") or []
        return bool(items) and any(_evaluate_entry(item, context) for item in items)
    return _evaluate_condition(group, context)


def _evaluate_entry(entry: dict[str, Any], context: dict[str, Any]) -> bool:
    if "all" in entry or "any" in entry:
        return _evaluate_group(entry, context)
    return _evaluate_condition(entry, context)


def _build_evidence(rule: dict[str, Any], context: dict[str, Any]) -> list[dict[str, Any]]:
    evidence_items: list[dict[str, Any]] = []
    for item in rule.get("evidence", []):
        if not isinstance(item, dict):
            continue
        path = str(item.get("path") or "").strip()
        value = _get_by_path(context, path)
        evidence_items.append(
            {
                "label": item.get("label") or path,
                "path": path,
                "value": value,
            }
        )
    return evidence_items


def _build_result(rule: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    return {
        "ruleId": rule.get("id"),
        "issueType": rule.get("issueType"),
        "message": rule.get("message"),
        "severity": rule.get("severity"),
        "title": rule.get("title"),
        "suggestedCodes": list(rule.get("suggestedCodes", [])),
        "evidence": _build_evidence(rule, context),
        "reportTargets": list(rule.get("reportTargets", [])),
        "observation": rule.get("observation"),
        "summaryComment": rule.get("summaryComment"),
        "source": rule.get("source"),
        "confidence": float(rule.get("confidence", 0.0)),
        "needsHumanReview": bool(rule.get("needsHumanReview", False)),
    }


def _derive_measurement_flags(certificate_context: dict[str, Any]) -> dict[str, Any]:
    measurements = dict(certificate_context.get("measurements") or {})

    def to_float(value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def classify_status(value: Any, *, suspicious_max: float | None = None, safe_threshold_max: float | None = None) -> str | None:
        numeric = to_float(value)
        if numeric is None:
            return None
        if numeric < 0:
            return "impossible"
        if suspicious_max is not None and numeric > suspicious_max:
            return "suspicious"
        if safe_threshold_max is not None and numeric > safe_threshold_max:
            return "review"
        return "ok"

    def classify_band(
        value: Any,
        *,
        low_threshold: float | None = None,
        high_threshold: float | None = None,
        unsafe_threshold: float | None = None,
    ) -> str | None:
        numeric = to_float(value)
        if numeric is None:
            return None
        if numeric < 0:
            return "unsafe"
        if unsafe_threshold is not None and numeric > unsafe_threshold:
            return "unsafe"
        if high_threshold is not None and numeric > high_threshold:
            return "high"
        if low_threshold is not None and numeric < low_threshold:
            return "low"
        return "ok"

    return {
        "zeStatus": classify_status(measurements.get("ze"), suspicious_max=100.0, safe_threshold_max=0.8),
        "zsStatus": classify_status(measurements.get("zs"), suspicious_max=100.0, safe_threshold_max=1.5),
        "pfcStatus": classify_status(measurements.get("pfc"), suspicious_max=50000.0, safe_threshold_max=16000.0),
        "psccStatus": classify_status(measurements.get("pscc"), suspicious_max=50000.0, safe_threshold_max=16000.0),
        "zeThresholdBand": classify_band(measurements.get("ze"), high_threshold=0.8, unsafe_threshold=100.0),
        "zsThresholdBand": classify_band(measurements.get("zs"), high_threshold=1.5, unsafe_threshold=100.0),
        "pfcThresholdBand": classify_band(measurements.get("pfc"), low_threshold=1.0, high_threshold=16000.0, unsafe_threshold=50000.0),
        "psccThresholdBand": classify_band(measurements.get("pscc"), low_threshold=1.0, high_threshold=16000.0, unsafe_threshold=50000.0),
    }


def _build_context(
    text_lines: list[str],
    image_quality: dict[str, Any] | None,
    derived: dict[str, Any] | None,
    certificate_context: dict[str, Any] | None,
) -> dict[str, Any]:
    image_quality = dict(image_quality or {})
    width = int(image_quality.get("width") or 0)
    height = int(image_quality.get("height") or 0)
    image_quality["maxDimension"] = max(width, height)

    joined_lower = "\n".join(line.lower() for line in text_lines if line)

    derived_consumer_unit = dict((derived or {}).get("consumerUnit") or {})
    normalized_certificate_context = dict(certificate_context or {})
    certificate_consumer_unit = dict(normalized_certificate_context.get("consumerUnit") or {})
    certificate_measurements = dict(normalized_certificate_context.get("measurements") or {})
    certificate_bonding = dict(normalized_certificate_context.get("bonding") or {})
    certificate_circuits = dict(normalized_certificate_context.get("circuits") or {})
    if "hasRcdProtection" in certificate_consumer_unit and "hasRCD" not in certificate_consumer_unit:
        certificate_consumer_unit["hasRCD"] = certificate_consumer_unit.get("hasRcdProtection")
    if "hasRcboProtection" in certificate_consumer_unit and "hasRCBO" not in certificate_consumer_unit:
        certificate_consumer_unit["hasRCBO"] = certificate_consumer_unit.get("hasRcboProtection")
    if "hasSpd" in certificate_consumer_unit and "hasSPD" not in certificate_consumer_unit:
        certificate_consumer_unit["hasSPD"] = certificate_consumer_unit.get("hasSpd")

    if derived_consumer_unit.get("brand"):
        derived_consumer_unit["brandLower"] = str(derived_consumer_unit["brand"]).lower()
    if derived_consumer_unit.get("model"):
        derived_consumer_unit["modelUpper"] = str(derived_consumer_unit["model"]).upper()
    if derived_consumer_unit.get("serialNumber"):
        derived_consumer_unit["serialNumberUpper"] = str(derived_consumer_unit["serialNumber"]).upper()

    if certificate_consumer_unit.get("brand"):
        certificate_consumer_unit["brandLower"] = str(certificate_consumer_unit["brand"]).lower()
    if certificate_consumer_unit.get("model"):
        certificate_consumer_unit["modelUpper"] = str(certificate_consumer_unit["model"]).upper()
    if certificate_consumer_unit.get("serialNumber"):
        certificate_consumer_unit["serialNumberUpper"] = str(certificate_consumer_unit["serialNumber"]).upper()

    normalized_certificate_context["consumerUnit"] = certificate_consumer_unit
    normalized_certificate_context["measurements"] = certificate_measurements
    normalized_certificate_context["bonding"] = certificate_bonding
    normalized_certificate_context["circuits"] = certificate_circuits
    normalized_certificate_context["measurementFlags"] = _derive_measurement_flags(normalized_certificate_context)

    return {
        "ocr": {
            "lineCount": len(text_lines),
        },
        "text": {
            "lines": text_lines,
            "joinedLower": joined_lower,
        },
        "imageQuality": image_quality,
        "derived": {
            "consumerUnit": derived_consumer_unit,
        },
        "certificate": normalized_certificate_context,
    }


@lru_cache(maxsize=8)
def load_rule_pack(file_name: str = DEFAULT_RULE_PACK) -> dict[str, Any]:
    rule_path = RULES_DIR / file_name
    with rule_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=8)
def load_rule_packs(file_names: tuple[str, ...] = DEFAULT_RULE_PACKS) -> list[dict[str, Any]]:
    packs: list[dict[str, Any]] = []
    for file_name in file_names:
        rule_path = RULES_DIR / file_name
        if not rule_path.exists():
            continue
        packs.append(load_rule_pack(file_name))
    return packs


def evaluate_rules(
    text_lines: list[str],
    image_quality: dict[str, Any] | None = None,
    derived: dict[str, Any] | None = None,
    certificate_context: dict[str, Any] | None = None,
    rule_pack: dict[str, Any] | None = None,
    rule_packs: list[dict[str, Any]] | None = None,
    extracted: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    normalized_derived = dict(derived or {})
    if extracted:
        normalized_derived.setdefault(
            "consumerUnit",
            {
                "brand": extracted.get("brand"),
                "model": extracted.get("model"),
                "serialNumber": extracted.get("serialNumber"),
                "hasRCD": extracted.get("hasRCDHint"),
                "hasRCBO": extracted.get("hasRCBOHint"),
                "hasSPD": extracted.get("hasSPDHint"),
                "hasMainSwitch": extracted.get("hasMainSwitchHint"),
                "observations": extracted.get("observations") or [],
            },
        )

    normalized_certificate_context = dict(certificate_context or {})
    if "protectiveDevices" in normalized_certificate_context and "consumerUnit" in normalized_certificate_context:
        consumer_unit = dict(normalized_certificate_context.get("consumerUnit") or {})
        protective_devices = dict(normalized_certificate_context.get("protectiveDevices") or {})
        if "hasRCD" in protective_devices and "hasRcdProtection" not in consumer_unit:
            consumer_unit["hasRcdProtection"] = protective_devices.get("hasRCD")
        if "hasRCBO" in protective_devices and "hasRcboProtection" not in consumer_unit:
            consumer_unit["hasRcboProtection"] = protective_devices.get("hasRCBO")
        if "hasSPD" in protective_devices and "hasSpd" not in consumer_unit:
            consumer_unit["hasSpd"] = protective_devices.get("hasSPD")
        normalized_certificate_context["consumerUnit"] = consumer_unit

    context = _build_context(
        text_lines=text_lines,
        image_quality=image_quality,
        derived=normalized_derived,
        certificate_context=normalized_certificate_context,
    )

    packs_to_evaluate: list[dict[str, Any]] = []
    if rule_pack is not None:
        packs_to_evaluate.append(rule_pack)
    elif rule_packs is not None:
        packs_to_evaluate.extend(rule_packs)
    else:
        packs_to_evaluate.extend(load_rule_packs())

    results: list[dict[str, Any]] = []
    for pack in packs_to_evaluate:
        for rule in pack.get("rules", []):
            if not isinstance(rule, dict):
                continue
            conditions = rule.get("conditions")
            if not isinstance(conditions, dict):
                continue
            if _evaluate_group(conditions, context):
                results.append(_build_result(rule, context))

    return results


__all__ = ["DEFAULT_RULE_PACK", "DEFAULT_RULE_PACKS", "evaluate_rules", "load_rule_pack", "load_rule_packs"]
