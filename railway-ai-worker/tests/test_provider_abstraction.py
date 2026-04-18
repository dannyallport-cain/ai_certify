from __future__ import annotations

import asyncio
import importlib
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient


def _clear_provider_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in [
        "LOCAL_LLM_PROVIDER",
        "LOCAL_LLM_BASE_URL",
        "LOCAL_LLM_MODEL",
        "OLLAMA_BASE_URL",
        "OLLAMA_MODEL",
        "LM_STUDIO_BASE_URL",
        "LM_STUDIO_MODEL",
        "OPENAI_API_KEY",
        "OPENROUTER_API_KEY",
    ]:
        monkeypatch.delenv(key, raising=False)


def _reload_provider_module():
    module = importlib.import_module("app.llm_provider")
    return importlib.reload(module)


def _client_get_json(client: TestClient, path: str) -> dict[str, Any]:
    response = client.get(path)
    assert response.status_code == 200
    return response.json()


class _MockResponse:
    def __init__(self, payload: dict[str, Any], status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code

    def json(self) -> dict[str, Any]:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("GET", "http://mock.local")
            response = httpx.Response(status_code=self.status_code, request=request)
            raise httpx.HTTPStatusError(
                f"HTTP {self.status_code}",
                request=request,
                response=response,
            )


class _MockAsyncClient:
    def __init__(self, handler, *args, **kwargs) -> None:
        self._handler = handler

    async def __aenter__(self) -> "_MockAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        return False

    async def get(self, url: str, *args, **kwargs):
        return self._handler("GET", url, *args, **kwargs)


def test_provider_defaults_to_disabled_when_no_env_vars_set(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    provider_module = _reload_provider_module()

    config = provider_module.resolve_local_llm_provider_config()

    assert config.provider == "disabled"
    assert config.base_url is None
    assert config.model is None
    assert config.enabled is False
    assert config.api_style == "none"


def test_provider_prefers_explicit_local_provider_env(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LOCAL_LLM_PROVIDER", "lmstudio")
    monkeypatch.setenv("LOCAL_LLM_BASE_URL", "http://lmstudio.local:1234/v1")
    monkeypatch.setenv("LOCAL_LLM_MODEL", "local-model")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://ollama.local:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "llama3.1")

    provider_module = _reload_provider_module()
    config = provider_module.resolve_local_llm_provider_config()

    assert config.provider == "lmstudio"
    assert config.base_url == "http://lmstudio.local:1234/v1"
    assert config.model == "local-model"
    assert config.enabled is True
    assert config.api_style == "openai-compatible"


def test_provider_infers_ollama_from_provider_specific_env(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "llama3.2")

    provider_module = _reload_provider_module()
    config = provider_module.resolve_local_llm_provider_config()

    assert config.provider == "ollama"
    assert config.base_url == "http://127.0.0.1:11434"
    assert config.model == "llama3.2"
    assert config.enabled is True
    assert config.api_style == "ollama"


def test_provider_infers_lmstudio_from_provider_specific_env(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234/v1")
    monkeypatch.setenv("LM_STUDIO_MODEL", "qwen-local")

    provider_module = _reload_provider_module()
    config = provider_module.resolve_local_llm_provider_config()

    assert config.provider == "lmstudio"
    assert config.base_url == "http://127.0.0.1:1234/v1"
    assert config.model == "qwen-local"
    assert config.enabled is True
    assert config.api_style == "openai-compatible"


def test_disabled_provider_probe_returns_non_network_status(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LOCAL_LLM_PROVIDER", "disabled")

    provider_module = _reload_provider_module()
    probe = asyncio.run(provider_module.probe_local_llm_provider())

    assert probe.provider == "disabled"
    assert probe.enabled is False
    assert probe.status == "disabled"
    assert probe.base_url is None
    assert probe.model is None
    assert probe.reachable is None


def test_ollama_probe_uses_tags_endpoint_and_reports_model_presence(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LOCAL_LLM_PROVIDER", "ollama")
    monkeypatch.setenv("LOCAL_LLM_BASE_URL", "http://ollama.local:11434")
    monkeypatch.setenv("LOCAL_LLM_MODEL", "llama3.1")

    provider_module = _reload_provider_module()
    calls: list[tuple[str, str]] = []

    def handler(method: str, url: str, *args, **kwargs):
        calls.append((method, url))
        return _MockResponse(
            {
                "models": [
                    {"name": "llama3.1"},
                    {"name": "mistral"},
                ]
            }
        )

    monkeypatch.setattr(provider_module.httpx, "AsyncClient", lambda *args, **kwargs: _MockAsyncClient(handler))

    probe = asyncio.run(provider_module.probe_local_llm_provider())

    assert calls == [("GET", "http://ollama.local:11434/api/tags")]
    assert probe.provider == "ollama"
    assert probe.healthy is True
    assert probe.status == "ok"
    assert probe.model == "llama3.1"
    assert probe.selected_model_available is True
    assert probe.available_models == ["llama3.1", "mistral"]


def test_lmstudio_probe_uses_models_endpoint_and_reports_model_presence(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LOCAL_LLM_PROVIDER", "lmstudio")
    monkeypatch.setenv("LOCAL_LLM_BASE_URL", "http://lmstudio.local:1234/v1")
    monkeypatch.setenv("LOCAL_LLM_MODEL", "qwen-local")

    provider_module = _reload_provider_module()
    calls: list[tuple[str, str]] = []

    def handler(method: str, url: str, *args, **kwargs):
        calls.append((method, url))
        return _MockResponse(
            {
                "data": [
                    {"id": "qwen-local"},
                    {"id": "other-model"},
                ]
            }
        )

    monkeypatch.setattr(provider_module.httpx, "AsyncClient", lambda *args, **kwargs: _MockAsyncClient(handler))

    probe = asyncio.run(provider_module.probe_local_llm_provider())

    assert calls == [("GET", "http://lmstudio.local:1234/v1/models")]
    assert probe.provider == "lmstudio"
    assert probe.healthy is True
    assert probe.status == "ok"
    assert probe.model == "qwen-local"
    assert probe.selected_model_available is True
    assert probe.available_models == ["qwen-local", "other-model"]


def test_openai_compatible_probe_sends_auth_header(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LOCAL_LLM_PROVIDER", "openai")
    monkeypatch.setenv("LOCAL_LLM_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("LOCAL_LLM_MODEL", "google/gemma-3-4b-it")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    provider_module = _reload_provider_module()
    captured_headers: list[dict[str, str]] = []

    def handler(method: str, url: str, *args, **kwargs):
        captured_headers.append(kwargs.get("headers", {}))
        return _MockResponse({"data": [{"id": "google/gemma-3-4b-it"}]})

    monkeypatch.setattr(provider_module.httpx, "AsyncClient", lambda *args, **kwargs: _MockAsyncClient(handler))

    probe = asyncio.run(provider_module.probe_local_llm_provider())

    assert probe.status == "ok"
    assert captured_headers[0]["Authorization"] == "Bearer test-key"


def test_run_hosted_inference_returns_structured_json(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LOCAL_LLM_PROVIDER", "openai")
    monkeypatch.setenv("LOCAL_LLM_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("LOCAL_LLM_MODEL", "google/gemma-3-4b-it")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    provider_module = _reload_provider_module()
    captured: list[tuple[str, str, dict[str, Any], dict[str, str]]] = []

    class _MockInferenceClient:
        async def __aenter__(self) -> "_MockInferenceClient":
            return self

        async def __aexit__(self, exc_type, exc, tb) -> bool:
            return False

        async def post(self, url: str, *args, **kwargs):
            captured.append(("POST", url, kwargs.get("json", {}), kwargs.get("headers", {})))
            return _MockResponse(
                {
                    "choices": [
                        {
                            "message": {
                                "content": '{"summary":"board looks serviceable","observations":["SPD marking detected"],"recommendedCodes":["C3"]}'
                            }
                        }
                    ]
                }
            )

    monkeypatch.setattr(provider_module.httpx, "AsyncClient", lambda *args, **kwargs: _MockInferenceClient())

    result = asyncio.run(provider_module.run_hosted_inference(prompt="test prompt"))

    assert result is not None
    assert result.summary == "board looks serviceable"
    assert result.observations == ["SPD marking detected"]
    assert result.recommended_codes == ["C3"]
    assert captured[0][1] == "https://openrouter.ai/api/v1/chat/completions"
    assert captured[0][3]["Authorization"] == "Bearer test-key"


def test_health_endpoint_preserves_required_fields_when_provider_metadata_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LOCAL_LLM_PROVIDER", "disabled")

    from app import main

    app_module = importlib.reload(main)
    client = TestClient(app_module.app)

    data = _client_get_json(client, "/health")

    assert data["status"] == "ok"
    assert data["service"] == "railway-ai-worker"
    assert data["localLlm"]["provider"] == "disabled"
    assert data["localLlm"]["status"] == "disabled"


def test_analyze_image_model_info_preserves_required_keys_when_provider_metadata_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("LOCAL_LLM_PROVIDER", "disabled")

    from app import main

    app_module = importlib.reload(main)

    expected_result = {
        "success": True,
        "summary": "done",
        "findings": {
            "consumerUnit": None,
            "accessories": [],
            "textDetections": [],
            "observations": [],
        },
        "prefill": {
            "observations": [],
            "recommendedCodes": [],
            "reportSections": {},
        },
        "needsHumanReview": False,
        "modelInfo": {
            "detector": "manual-crop",
            "ocr": "noop",
            "extractor": "rules+regex",
            "localLlm": {
                "provider": "disabled",
                "enabled": False,
                "status": "disabled",
            },
        },
        "inferenceResults": [],
        "issues": [],
    }

    def fake_analyze_image(payload: Any) -> Any:
        return expected_result

    monkeypatch.setattr(app_module, "_load_pipeline_module", lambda: {"analyze_image": fake_analyze_image})

    client = TestClient(app_module.app)
    response = client.post("/analyze-image", json={"imageUrl": "https://example.com/cert.jpg"})

    assert response.status_code == 200
    data = response.json()
    assert data["modelInfo"]["detector"] == "manual-crop"
    assert data["modelInfo"]["ocr"] == "noop"
    assert data["modelInfo"]["extractor"] == "rules+regex"
    assert data["modelInfo"]["localLlm"]["provider"] == "disabled"
    assert data["modelInfo"]["localLlm"]["status"] == "disabled"
