from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

import httpx

ProviderName = Literal["disabled", "ollama", "lmstudio"]


@dataclass(frozen=True)
class LocalLLMProviderConfig:
    provider: ProviderName
    base_url: str | None
    model: str | None
    enabled: bool
    source: str
    api_style: Literal["none", "ollama", "openai-compatible"]


@dataclass(frozen=True)
class LocalLLMProbeResult:
    provider: ProviderName
    enabled: bool
    configured: bool
    base_url: str | None
    model: str | None
    api_style: Literal["none", "ollama", "openai-compatible"]
    source: str
    reachable: bool | None = None
    healthy: bool | None = None
    available_models: list[str] | None = None
    selected_model_available: bool | None = None
    status: str | None = None
    detail: str | None = None


def _clean_env(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalize_provider(value: str | None) -> ProviderName | None:
    normalized = _clean_env(value)
    if normalized is None:
        return None

    lowered = normalized.lower()
    if lowered in {"disabled", "none", "off", "false", "0"}:
        return "disabled"
    if lowered in {"ollama"}:
        return "ollama"
    if lowered in {"lmstudio", "lm-studio", "openai", "openai-compatible"}:
        return "lmstudio"
    return None


def _normalize_base_url(value: str | None) -> str | None:
    cleaned = _clean_env(value)
    if cleaned is None:
        return None
    return cleaned.rstrip("/")


def resolve_local_llm_provider_config() -> LocalLLMProviderConfig:
    explicit_provider = _normalize_provider(os.getenv("LOCAL_LLM_PROVIDER"))
    local_base_url = _normalize_base_url(os.getenv("LOCAL_LLM_BASE_URL"))
    local_model = _clean_env(os.getenv("LOCAL_LLM_MODEL"))
    ollama_base_url = _normalize_base_url(os.getenv("OLLAMA_BASE_URL"))
    ollama_model = _clean_env(os.getenv("OLLAMA_MODEL"))
    lmstudio_base_url = _normalize_base_url(os.getenv("LM_STUDIO_BASE_URL"))
    lmstudio_model = _clean_env(os.getenv("LM_STUDIO_MODEL"))

    if explicit_provider is not None:
        if explicit_provider == "disabled":
            return LocalLLMProviderConfig(
                provider="disabled",
                base_url=None,
                model=None,
                enabled=False,
                source="LOCAL_LLM_PROVIDER",
                api_style="none",
            )

        if explicit_provider == "ollama":
            return LocalLLMProviderConfig(
                provider="ollama",
                base_url=local_base_url or ollama_base_url or "http://127.0.0.1:11434",
                model=local_model or ollama_model,
                enabled=True,
                source="LOCAL_LLM_PROVIDER",
                api_style="ollama",
            )

        return LocalLLMProviderConfig(
            provider="lmstudio",
            base_url=local_base_url or lmstudio_base_url or "http://127.0.0.1:1234/v1",
            model=local_model or lmstudio_model,
            enabled=True,
            source="LOCAL_LLM_PROVIDER",
            api_style="openai-compatible",
        )

    if local_base_url or local_model:
        return LocalLLMProviderConfig(
            provider="lmstudio",
            base_url=local_base_url or "http://127.0.0.1:1234/v1",
            model=local_model,
            enabled=True,
            source="LOCAL_LLM_BASE_URL/LOCAL_LLM_MODEL",
            api_style="openai-compatible",
        )

    if ollama_base_url or ollama_model:
        return LocalLLMProviderConfig(
            provider="ollama",
            base_url=ollama_base_url or "http://127.0.0.1:11434",
            model=ollama_model,
            enabled=True,
            source="OLLAMA_BASE_URL/OLLAMA_MODEL",
            api_style="ollama",
        )

    if lmstudio_base_url or lmstudio_model:
        return LocalLLMProviderConfig(
            provider="lmstudio",
            base_url=lmstudio_base_url or "http://127.0.0.1:1234/v1",
            model=lmstudio_model,
            enabled=True,
            source="LM_STUDIO_BASE_URL/LM_STUDIO_MODEL",
            api_style="openai-compatible",
        )

    return LocalLLMProviderConfig(
        provider="disabled",
        base_url=None,
        model=None,
        enabled=False,
        source="default",
        api_style="none",
    )


async def probe_local_llm_provider(timeout: float = 2.5) -> LocalLLMProbeResult:
    config = resolve_local_llm_provider_config()

    if not config.enabled:
        return LocalLLMProbeResult(
            provider=config.provider,
            enabled=False,
            configured=False,
            base_url=config.base_url,
            model=config.model,
            api_style=config.api_style,
            source=config.source,
            status="disabled",
            detail="Local LLM provider is disabled; OCR and rules pipeline remains available.",
        )

    if not config.base_url:
        return LocalLLMProbeResult(
            provider=config.provider,
            enabled=True,
            configured=False,
            base_url=None,
            model=config.model,
            api_style=config.api_style,
            source=config.source,
            reachable=False,
            healthy=False,
            status="misconfigured",
            detail="Provider is enabled but no base URL is configured.",
        )

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if config.provider == "ollama":
                response = await client.get(f"{config.base_url}/api/tags")
                response.raise_for_status()
                payload = response.json()
                models = [
                    str(item.get("name"))
                    for item in payload.get("models", [])
                    if isinstance(item, dict) and item.get("name")
                ]
            else:
                response = await client.get(f"{config.base_url}/models")
                response.raise_for_status()
                payload = response.json()
                models = [
                    str(item.get("id"))
                    for item in payload.get("data", [])
                    if isinstance(item, dict) and item.get("id")
                ]
    except httpx.HTTPError as exc:
        return LocalLLMProbeResult(
            provider=config.provider,
            enabled=True,
            configured=True,
            base_url=config.base_url,
            model=config.model,
            api_style=config.api_style,
            source=config.source,
            reachable=False,
            healthy=False,
            status="unreachable",
            detail=str(exc),
        )

    selected_model_available = None
    if config.model:
        selected_model_available = config.model in models

    detail = "Provider reachable."
    if config.model and selected_model_available is False:
        detail = "Provider reachable, but configured model was not reported by the server."
    elif config.model and selected_model_available is True:
        detail = "Provider reachable and configured model is available."

    return LocalLLMProbeResult(
        provider=config.provider,
        enabled=True,
        configured=True,
        base_url=config.base_url,
        model=config.model,
        api_style=config.api_style,
        source=config.source,
        reachable=True,
        healthy=True,
        available_models=models,
        selected_model_available=selected_model_available,
        status="ok",
        detail=detail,
    )