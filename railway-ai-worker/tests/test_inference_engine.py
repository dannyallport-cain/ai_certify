from __future__ import annotations

import importlib
from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas import AnalyzeImageRequest


def _load_pipeline_module():
    return importlib.import_module("app.pipeline")


def _response_dump(response: Any) -> dict[str, Any]:
    if hasattr(response, "model_dump"):
        return response.model_dump()
    return dict(response)


def test_request_requires_an_image_source() -> None:
    with pytest.raises(ValidationError):
        AnalyzeImageRequest()


def test_pipeline_handles_unloadable_image_with_human_review(monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline = _load_pipeline_module()

    def fake_ocr_from_inputs(*, image_url: str | None, image_base64: str | None) -> dict[str, Any]:
        return {
            "imageLoaded": False,
            "textLines": [],
            "imageQuality": {
                "status": "unavailable",
                "lineCount": 0,
                "width": 0,
                "height": 0,
            },
        }

    monkeypatch.setattr(pipeline, "ocr_from_inputs", fake_ocr_from_inputs)

    payload = AnalyzeImageRequest(imageUrl="https://example.com/missing.jpg")
    response = pipeline.analyze_image(payload)
    data = _response_dump(response)

    assert data["success"] is True
    assert data["needsHumanReview"] is True
    assert "OCR analysis completed" in data["summary"]

    observations = data["findings"]["observations"]
    assert any("could not be loaded" in item.lower() for item in observations)
    assert any("no ocr text was extracted" in item.lower() for item in observations)

    assert data["findings"]["consumerUnit"] is None
    assert "manual-review" in data["prefill"]["recommendedCodes"]
    assert data["prefill"]["reportSections"]["imageQuality"]["status"] == "unavailable"


def test_pipeline_echoes_requested_sections_and_context(monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline = _load_pipeline_module()

    def fake_ocr_from_inputs(*, image_url: str | None, image_base64: str | None) -> dict[str, Any]:
        return {
            "imageLoaded": True,
            "textLines": [
                "Hager consumer unit",
                "RCBO fitted",
                "SPD installed",
                "Type A",
            ],
            "imageQuality": {
                "status": "good",
                "lineCount": 4,
                "width": 1600,
                "height": 1200,
            },
        }

    monkeypatch.setattr(pipeline, "ocr_from_inputs", fake_ocr_from_inputs)

    payload = AnalyzeImageRequest(
        imageUrl="https://example.com/cu.jpg",
        requestedSections=["ocrText", "protectiveDevices"],
        reportType="EICR",
        inspectionType="periodic",
        metadata={"jobId": "abc123"},
    )
    response = pipeline.analyze_image(payload)
    data = _response_dump(response)

    observations = data["findings"]["observations"]
    assert any("requested sections were considered" in item.lower() for item in observations)
    assert any("report type context: eicr" in item.lower() for item in observations)
    assert any("inspection type context: periodic" in item.lower() for item in observations)

    report_sections = data["prefill"]["reportSections"]
    assert report_sections["requestedSections"] == ["ocrText", "protectiveDevices"]
    assert report_sections["reportType"] == "EICR"
    assert report_sections["inspectionType"] == "periodic"
    assert report_sections["metadataEcho"] == {"jobId": "abc123"}
    assert report_sections["protectiveDevices"]["hasRCBO"] is True
    assert report_sections["protectiveDevices"]["hasSPD"] is True


def test_inference_response_structure_when_extended_fields_exist() -> None:
    schemas = importlib.import_module("app.schemas")

    if not hasattr(schemas, "InferenceResult"):
        pytest.skip("Extended inference schema not available yet.")

    InferenceResult = getattr(schemas, "InferenceResult")
    AnalyzeImageResponse = getattr(schemas, "AnalyzeImageResponse")
    Findings = getattr(schemas, "Findings")
    Prefill = getattr(schemas, "Prefill")
    ModelInfo = getattr(schemas, "ModelInfo")

    inference = InferenceResult(
        ruleId="rcd.type-ac.v1",
        issueType="safety",
        message="Type AC wording detected.",
        severity="medium",
        suggestedCodes=["further-investigation"],
        evidence=[],
        source="ocr-text",
        confidence=0.86,
        needsHumanReview=True,
    )

    response = AnalyzeImageResponse(
        success=True,
        summary="Test summary.",
        findings=Findings(),
        prefill=Prefill(),
        needsHumanReview=True,
        modelInfo=ModelInfo(detector="not-enabled", ocr="pytesseract-ocr-v1", extractor="ocr-rules-v1"),
        inferenceResults=[inference],
        issues=[],
    )

    data = _response_dump(response)
    assert "inferenceResults" in data
    assert data["inferenceResults"][0]["ruleId"] == "rcd.type-ac.v1"
    assert data["inferenceResults"][0]["message"] == "Type AC wording detected."
    assert data["inferenceResults"][0]["suggestedCodes"] == ["further-investigation"]


def test_certificate_context_schema_support_when_present() -> None:
    schemas = importlib.import_module("app.schemas")

    if not hasattr(schemas, "CertificateContext"):
        pytest.skip("certificateContext schema not available yet.")

    AnalyzeImageRequestExtended = getattr(schemas, "AnalyzeImageRequest")

    payload = AnalyzeImageRequestExtended(
        imageUrl="https://example.com/cu.jpg",
        certificateContext={
            "consumerUnit": {
                "brand": "Hager",
                "model": "VM123",
                "serialNumber": "ABC12345",
            }
        },
    )

    dumped = payload.model_dump()
    assert "certificateContext" in dumped
    assert dumped["certificateContext"]["consumerUnit"]["brand"] == "Hager"


def test_rules_engine_certificate_context_mismatch_when_available() -> None:
    try:
        engine = importlib.import_module("app.rules.engine")
    except ModuleNotFoundError:
        pytest.skip("Rules engine module not available yet.")

    if not hasattr(engine, "evaluate_rules"):
        pytest.skip("Rules engine evaluate_rules function not available yet.")

    evaluate_rules = getattr(engine, "evaluate_rules")

    extracted = {
        "brand": "Hager",
        "model": "VM123",
        "serialNumber": "ABC12345",
        "hasRCDHint": True,
        "hasRCBOHint": False,
        "hasSPDHint": False,
        "observations": ["Type AC marking detected."],
    }
    certificate_context = {
        "consumerUnit": {
            "brand": "Wylex",
            "model": "NMRS12",
            "serialNumber": "ZZ99999",
        },
        "protectiveDevices": {
            "hasRCD": False,
            "hasRCBO": True,
            "hasSPD": True,
        },
    }
    image_quality = {
        "status": "good",
        "lineCount": 3,
        "width": 1400,
        "height": 900,
    }

    results = evaluate_rules(
        extracted=extracted,
        certificate_context=certificate_context,
        image_quality=image_quality,
        text_lines=["Hager", "RCD", "Type AC"],
    )

    assert isinstance(results, list)
    assert results, "Expected at least one rule result for mismatch checks."

    first = results[0]
    if hasattr(first, "model_dump"):
        first = first.model_dump()

    for key in [
        "ruleId",
        "issueType",
        "message",
        "severity",
        "suggestedCodes",
        "evidence",
        "source",
        "confidence",
        "needsHumanReview",
    ]:
        assert key in first

    rendered = " ".join(str(item) for item in results).lower()
    assert any(token in rendered for token in ["mismatch", "certificate", "brand", "model", "serial", "rcd", "rcbo", "spd"])


def test_rules_engine_loads_compiled_standards_pack_by_default() -> None:
    engine = importlib.import_module("app.rules.engine")

    evaluate_rules = getattr(engine, "evaluate_rules")
    results = evaluate_rules(
        text_lines=["Consumer unit label", "Type AC", "Main switch present"],
        image_quality={"status": "good", "lineCount": 3, "width": 1200, "height": 800},
        derived={"consumerUnit": {"brand": "Hager"}},
        certificate_context=None,
    )

    rendered = " ".join(str(item) for item in results).lower()
    assert "type ac" in rendered
    assert any("standards_compiler" in str(item) for item in results)


def test_pipeline_reports_combined_rule_pack_version(monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline = _load_pipeline_module()

    def fake_ocr_from_inputs(*, image_url: str | None, image_base64: str | None) -> dict[str, Any]:
        return {
            "imageLoaded": True,
            "textLines": [
                "Consumer unit",
                "Type AC",
                "Hager",
            ],
            "imageQuality": {
                "status": "good",
                "lineCount": 3,
                "width": 1200,
                "height": 800,
            },
        }

    monkeypatch.setattr(pipeline, "ocr_from_inputs", fake_ocr_from_inputs)

    payload = AnalyzeImageRequest(imageUrl="https://example.com/cu.jpg")
    response = pipeline.analyze_image(payload)
    data = _response_dump(response)

    assert data["prefill"]["reportSections"]["rulePackVersion"] == "v1.0+v1.1-standards+v1.2-curated-domains"
    assert data["modelInfo"]["extractor"] == "ocr-rules-v1.0+standards-v1.1+curated-v1.2"
    assert any(item["source"] == "standards_compiler" for item in data.get("inferenceResults", []))


def test_curated_domain_packs_match_expected_sources() -> None:
    engine = importlib.import_module("app.rules.engine")
    evaluate_rules = getattr(engine, "evaluate_rules")

    results = evaluate_rules(
        text_lines=[
            "Consumer unit",
            "Type AC RCD",
            "labels missing",
            "bonding conductor",
            "thermal damage",
            "missing blanks",
            "rust present",
        ],
        image_quality={"status": "good", "lineCount": 7, "width": 1600, "height": 1200},
        derived={"consumerUnit": {"brand": "Hager"}},
        certificate_context=None,
    )

    sources = {str(item.get("source")) for item in results if isinstance(item, dict)}
    assert "bs7671.curated" in sources
    assert "gn3.curated" in sources
    assert "eicr.curated" in sources
    assert "image_observation.curated" in sources


def test_rules_engine_maps_certificate_protective_device_aliases_to_consumer_unit_fields() -> None:
    engine = importlib.import_module("app.rules.engine")
    evaluate_rules = getattr(engine, "evaluate_rules")

    results = evaluate_rules(
        text_lines=["Consumer unit", "RCD front cover marking only"],
        image_quality={"status": "good", "lineCount": 2, "width": 1200, "height": 800},
        derived={
            "consumerUnit": {
                "brand": "Hager",
                "hasRCD": True,
                "hasRCBO": False,
                "hasSPD": False,
            }
        },
        certificate_context={
            "consumerUnit": {
                "brand": "Hager",
            },
            "protectiveDevices": {
                "hasRCD": False,
                "hasRCBO": True,
                "hasSPD": True,
            },
        },
    )

    rule_ids = {item["ruleId"] for item in results}
    assert "cert-rcd-mismatch" in rule_ids
    assert "cert-rcbo-mismatch" in rule_ids
    assert "cert-spd-mismatch" in rule_ids

    rcd_result = next(item for item in results if item["ruleId"] == "cert-rcd-mismatch")
    evidence_by_label = {entry["label"]: entry["value"] for entry in rcd_result["evidence"]}
    assert evidence_by_label["certificateHasRCD"] is False
    assert evidence_by_label["derivedHasRCD"] is True
    assert rcd_result["issueType"] == "certificate_consistency"
    assert rcd_result["source"] == "certificate_context"
    assert rcd_result["suggestedCodes"] == ["manual-review"]


def test_pipeline_includes_certificate_context_and_mismatch_results_in_report_sections(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pipeline = _load_pipeline_module()

    def fake_ocr_from_inputs(*, image_url: str | None, image_base64: str | None) -> dict[str, Any]:
        return {
            "imageLoaded": True,
            "textLines": [
                "Hager consumer unit",
                "RCBO fitted",
                "SPD installed",
                "main switch present",
            ],
            "imageQuality": {
                "status": "good",
                "lineCount": 4,
                "width": 1600,
                "height": 1200,
            },
        }

    monkeypatch.setattr(pipeline, "ocr_from_inputs", fake_ocr_from_inputs)

    payload = AnalyzeImageRequest(
        imageUrl="https://example.com/cu-mismatch.jpg",
        certificateContext={
            "consumerUnit": {
                "brand": "Wylex",
                "model": "NMRS12",
                "serialNumber": "ZZ99999",
                "hasMainSwitch": False,
                "hasRcdProtection": False,
                "hasRcboProtection": False,
                "hasSpd": False,
            }
        },
    )
    response = pipeline.analyze_image(payload)
    data = _response_dump(response)

    report_sections = data["prefill"]["reportSections"]
    assert report_sections["certificateContext"]["consumerUnit"]["brand"] == "Wylex"

    results_by_id = {item["ruleId"]: item for item in data["inferenceResults"]}
    assert "cert-brand-mismatch" in results_by_id
    assert "cert-rcbo-mismatch" in results_by_id
    assert "cert-spd-mismatch" in results_by_id
    assert "cert-main-switch-marked-absent-but-ocr-shows-main-switch" in results_by_id

    identified_defect_ids = {item["ruleId"] for item in report_sections["identifiedDefects"]}
    assert "cert-rcbo-marked-absent-but-ocr-shows-rcbo" in identified_defect_ids
    assert "cert-spd-marked-absent-but-ocr-shows-spd" in identified_defect_ids
    assert "cert-main-switch-marked-absent-but-ocr-shows-main-switch" in identified_defect_ids

    assert "manual-review" in data["prefill"]["recommendedCodes"]


def test_pipeline_maps_observation_coding_outputs_into_prefill_sections(monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline = _load_pipeline_module()

    def fake_ocr_from_inputs(*, image_url: str | None, image_base64: str | None) -> dict[str, Any]:
        return {
            "imageLoaded": True,
            "textLines": [
                "consumer unit",
                "labels missing",
                "thermal damage noted",
                "missing blanks to enclosure",
            ],
            "imageQuality": {
                "status": "good",
                "lineCount": 4,
                "width": 1500,
                "height": 1000,
            },
        }

    monkeypatch.setattr(pipeline, "ocr_from_inputs", fake_ocr_from_inputs)

    payload = AnalyzeImageRequest(imageUrl="https://example.com/observations.jpg")
    response = pipeline.analyze_image(payload)
    data = _response_dump(response)

    inference_by_id = {item["ruleId"]: item for item in data["inferenceResults"]}
    assert inference_by_id["eicr-label-identification-c3-review"]["suggestedCodes"] == ["C3", "manual-review"]
    assert inference_by_id["eicr-thermal-damage-fi-review"]["suggestedCodes"] == ["FI", "manual-review"]
    assert inference_by_id["eicr-openings-missing-blanks-c2-review"]["suggestedCodes"] == ["C2", "manual-review"]

    report_sections = data["prefill"]["reportSections"]
    assert report_sections["reportSummary"]["primaryCode"] == "FI"
    assert report_sections["observationsAndRecommendations"]["items"] == []
    assert report_sections["summaryComments"] == []
    assert "C3" in data["prefill"]["recommendedCodes"]
    assert "FI" in data["prefill"]["recommendedCodes"]
    assert "C2" in data["prefill"]["recommendedCodes"]


def test_missing_schema_fields_for_measured_value_and_bonding_validation_are_documented() -> None:
    payload = AnalyzeImageRequest(
        imageUrl="https://example.com/schema-review.jpg",
        certificateContext={
            "consumerUnit": {
                "brand": "Hager",
                "model": "VM123",
                "serialNumber": "ABC12345",
                "boardType": "metal",
                "hasMainSwitch": True,
                "hasRcdProtection": True,
                "hasRcboProtection": False,
                "hasSpd": True,
                "rcdType": "A",
            },
            "circuits": {
                "total": 12,
                "rcdProtectedCount": 6,
                "rcboCount": 6,
                "mcbCount": 0,
                "spdProtectedCount": 12,
            },
            "observations": {
                "codes": ["C2"],
                "notes": ["Existing observation."],
            },
            "metadata": {"jobId": "schema-review"},
        },
    )

    certificate_dump = payload.model_dump()["certificateContext"]
    consumer_unit_fields = set(certificate_dump["consumerUnit"].keys())
    circuit_fields = set(certificate_dump["circuits"].keys())
    observation_fields = set(certificate_dump["observations"].keys())

    assert {
        "brand",
        "model",
        "serialNumber",
        "boardType",
        "hasMainSwitch",
        "hasRcdProtection",
        "hasRcboProtection",
        "hasSpd",
        "rcdType",
    }.issubset(consumer_unit_fields)
    assert {
        "total",
        "rcdProtectedCount",
        "rcboCount",
        "mcbCount",
        "spdProtectedCount",
        "ratedCurrentValues",
    } == circuit_fields
    assert {"codes", "notes"} == observation_fields

    missing_fields = {
        "bonding.gas.sizeMm2",
        "bonding.water.sizeMm2",
    }
    available_paths = {
        "certificateContext.consumerUnit.brand",
        "certificateContext.consumerUnit.model",
        "certificateContext.consumerUnit.serialNumber",
        "certificateContext.consumerUnit.boardType",
        "certificateContext.consumerUnit.hasMainSwitch",
        "certificateContext.consumerUnit.hasRcdProtection",
        "certificateContext.consumerUnit.hasRcboProtection",
        "certificateContext.consumerUnit.hasSpd",
        "certificateContext.consumerUnit.rcdType",
        "certificateContext.circuits.total",
        "certificateContext.circuits.rcdProtectedCount",
        "certificateContext.circuits.rcboCount",
        "certificateContext.circuits.mcbCount",
        "certificateContext.circuits.spdProtectedCount",
        "certificateContext.circuits.ratedCurrentValues",
        "certificateContext.observations.codes",
        "certificateContext.observations.notes",
        "certificateContext.consumerUnit.mainSwitchRating",
        "certificateContext.consumerUnit.incomerRating",
        "certificateContext.consumerUnit.spdType",
        "certificateContext.measurements.ze",
        "certificateContext.measurements.zs",
        "certificateContext.measurements.pscc",
        "certificateContext.measurements.pfc",
        "certificateContext.bonding.gas.present",
        "certificateContext.bonding.water.present",
    }

    assert missing_fields.isdisjoint(available_paths)
    assert "certificateContext.consumerUnit.rcdType" in available_paths
    assert "certificateContext.observations.codes" in available_paths


def test_pipeline_prefills_missing_gas_bonding_sections_and_summary(monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline = _load_pipeline_module()

    def fake_ocr_from_inputs(*, image_url: str | None, image_base64: str | None) -> dict[str, Any]:
        return {
            "imageLoaded": True,
            "textLines": [
                "Schedule of items inspected",
                "Main protective bonding to gas: No",
                "Gas meter present",
                "Water bonding: Yes",
            ],
            "imageQuality": {
                "status": "good",
                "lineCount": 4,
                "width": 1600,
                "height": 1200,
            },
        }

    monkeypatch.setattr(pipeline, "ocr_from_inputs", fake_ocr_from_inputs)

    payload = AnalyzeImageRequest(imageUrl="https://example.com/gas-bonding.jpg")
    response = pipeline.analyze_image(payload)
    data = _response_dump(response)

    assert "C2" in data["prefill"]["recommendedCodes"]

    inference_results = data["inferenceResults"]
    matched = next(item for item in inference_results if item["ruleId"] == "eicr-main-bonding-gas-not-present-c2-review")
    assert matched["title"] == "Main protective bonding to gas service not present"
    assert matched["observation"]["code"] == "C2"
    assert matched["summaryComment"] == "Main protective bonding to gas service appears not present."

    report_sections = data["prefill"]["reportSections"]
    highlighted = report_sections["highlightedSections"]
    highlighted_keys = {item["sectionKey"] for item in highlighted}
    assert "supplyCharacteristicsAndEarthingArrangements" in highlighted_keys
    assert "inspectionSchedule" in highlighted_keys
    assert "observationsAndRecommendations" in highlighted_keys
    assert "summaryOfCondition" in highlighted_keys

    gas_bonding = report_sections["supplyCharacteristicsAndEarthingArrangements"]["mainProtectiveBonding"]["gas"]
    assert gas_bonding["present"] is False
    assert gas_bonding["evidenceRuleId"] == "eicr-main-bonding-gas-not-present-c2-review"

    inspection_items = report_sections["inspectionSchedule"]["items"]
    gas_item = next(item for item in inspection_items if item["itemKey"] == "mainProtectiveBondingGas")
    assert gas_item["suggestedCode"] == "C2"
    assert "gas service not present" in gas_item["comment"].lower()

    observations_items = report_sections["observationsAndRecommendations"]["items"]
    observation_item = next(item for item in observations_items if item["ruleId"] == "eicr-main-bonding-gas-not-present-c2-review")
    assert observation_item["suggestedCode"] == "C2"

    assert "Main protective bonding to gas service appears not present." in report_sections["summaryComments"]
    assert report_sections["reportSummary"]["primaryCode"] == "FI"


def test_pipeline_does_not_prefill_missing_gas_bonding_when_present(monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline = _load_pipeline_module()

    def fake_ocr_from_inputs(*, image_url: str | None, image_base64: str | None) -> dict[str, Any]:
        return {
            "imageLoaded": True,
            "textLines": [
                "Gas service present",
                "Main protective bonding to gas present",
                "10 mm bonding conductor connected",
            ],
            "imageQuality": {
                "status": "good",
                "lineCount": 3,
                "width": 1600,
                "height": 1200,
            },
        }

    monkeypatch.setattr(pipeline, "ocr_from_inputs", fake_ocr_from_inputs)

    payload = AnalyzeImageRequest(imageUrl="https://example.com/gas-bonding-present.jpg")
    response = pipeline.analyze_image(payload)
    data = _response_dump(response)

    assert all(item["ruleId"] != "eicr-main-bonding-gas-not-present-c2-review" for item in data["inferenceResults"])
    inspection_items = data["prefill"]["reportSections"]["inspectionSchedule"]["items"]
    assert all(item["itemKey"] != "mainProtectiveBondingGas" for item in inspection_items)


def test_pipeline_prefills_structured_measurement_and_bonding_findings(monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline = _load_pipeline_module()

    def fake_ocr_from_inputs(*, image_url: str | None, image_base64: str | None) -> dict[str, Any]:
        return {
            "imageLoaded": True,
            "textLines": [
                "Consumer unit schedule",
                "Hager board",
                "Main switch 100A",
                "SPD Type 2",
            ],
            "imageQuality": {
                "status": "good",
                "lineCount": 4,
                "width": 1600,
                "height": 1200,
            },
        }

    monkeypatch.setattr(pipeline, "ocr_from_inputs", fake_ocr_from_inputs)

    payload = AnalyzeImageRequest(
        imageUrl="https://example.com/structured-context.jpg",
        certificateContext={
            "consumerUnit": {
                "brand": "Hager",
                "mainSwitchRating": 80,
                "incomerRating": 100,
                "spdType": "Type 1",
                "hasSpd": False,
            },
            "measurements": {
                "ze": 1.8,
                "zs": -0.04,
                "pfc": 24000,
                "pscc": 24000,
            },
            "bonding": {
                "gas": {"present": False, "conductorSize": 10},
                "water": {"present": True, "conductorSize": 10},
            },
        },
    )
    response = pipeline.analyze_image(payload)
    data = _response_dump(response)

    report_sections = data["prefill"]["reportSections"]
    assert report_sections["certificateContext"]["measurements"]["ze"] == 1.8
    assert report_sections["certificateContext"]["bonding"]["gas"]["present"] is False
    assert report_sections["certificateContext"]["consumerUnit"]["mainSwitchRating"] == 80
    assert report_sections["consumerUnitDetails"]["incomerRating"] == 100
    assert report_sections["measurements"]["pfc"] == 24000
    assert report_sections["bonding"]["gas"]["conductorSize"] == 10

    results_by_id = {item["ruleId"]: item for item in data["inferenceResults"]}

    expected_rule_ids = {
        "cert-main-switch-rating-mismatch-with-incomer",
        "cert-spd-type-recorded-without-spd-present",
        "cert-ze-safe-threshold-review",
        "cert-zs-flagged-impossible-or-suspicious",
        "cert-gas-bonding-missing-from-structured-data",
    }
    assert expected_rule_ids.issubset(results_by_id)

    main_switch_result = results_by_id["cert-main-switch-rating-mismatch-with-incomer"]
    assert main_switch_result["reportTargets"]
    assert any(target["sectionKey"] == "consumerUnit" for target in main_switch_result["reportTargets"])
    assert main_switch_result["summaryComment"]

    bonding_result = results_by_id["cert-gas-bonding-missing-from-structured-data"]
    assert bonding_result["reportTargets"]
    assert bonding_result["summaryComment"] == "Gas bonding is marked absent in the structured certificate data."

    identified_defect_ids = {item["ruleId"] for item in report_sections["identifiedDefects"]}
    assert "cert-main-switch-rating-mismatch-with-incomer" in identified_defect_ids
    assert "cert-gas-bonding-missing-from-structured-data" in identified_defect_ids

    assert "manual-review" in data["prefill"]["recommendedCodes"]


def test_rules_engine_structured_measurement_and_rating_results_are_explainable() -> None:
    engine = importlib.import_module("app.rules.engine")
    evaluate_rules = getattr(engine, "evaluate_rules")

    results = evaluate_rules(
        text_lines=["Hager consumer unit", "Main switch 100A", "SPD Type 2"],
        image_quality={"status": "good", "lineCount": 3, "width": 1200, "height": 800},
        derived={
            "consumerUnit": {
                "brand": "Hager",
                "mainSwitchRating": 100,
                "incomerRating": 100,
                "spdType": "Type 2",
            },
        },
        certificate_context={
            "consumerUnit": {
                "brand": "Hager",
                "mainSwitchRating": 80,
                "incomerRating": 100,
                "spdType": "Type 1",
                "hasSpd": False,
            },
            "measurements": {
                "ze": 1.8,
                "zs": -0.04,
                "pfc": 24000,
                "pscc": 24000,
            },
            "bonding": {
                "gas": {"present": False, "conductorSize": 10},
                "water": {"present": True, "conductorSize": 10},
            },
        },
    )

    results_by_id = {item["ruleId"]: item for item in results}
    expected_rule_ids = {
        "cert-main-switch-rating-mismatch-with-incomer",
        "cert-spd-type-recorded-without-spd-present",
        "cert-gas-bonding-missing-from-structured-data",
        "cert-ze-safe-threshold-review",
        "cert-zs-flagged-impossible-or-suspicious",
    }
    assert expected_rule_ids.issubset(results_by_id)

    for rule_id in expected_rule_ids:
        item = results_by_id[rule_id]
        assert item["reportTargets"], f"Expected reportTargets for {rule_id}"
        assert item["summaryComment"], f"Expected summaryComment for {rule_id}"

    rendered = " ".join(str(item.get("summaryComment", "")) for item in results if isinstance(item, dict)).lower()
    assert "main switch" in rendered
    assert "spd" in rendered
    assert "gas" in rendered
