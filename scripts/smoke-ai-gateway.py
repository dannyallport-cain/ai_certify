#!/usr/bin/env python3
"""Smoke test for the Vercel AI Gateway credential.

Exercises the same gateway endpoints the app uses:

  GET  /v1/models              catalogue + auth, no credits consumed
  POST /v1/chat/completions    the path @ai-sdk/gateway uses (lib/ai/detector-vision.ts)
  POST /v1/responses           the path app/api/admin/report-disseminator/ai-gateway-analyze uses
  POST /v1/chat/completions    multimodal turn, mirroring the detector photo reader

Prompts and the synthetic image are deliberately tiny, so a full run costs a
fraction of a penny.

Usage:
    python3 scripts/smoke-ai-gateway.py
    AI_GATEWAY_API_KEY=vck_... python3 scripts/smoke-ai-gateway.py

The key is read from the environment first, then from .env.local.
"""

from __future__ import annotations

import base64
import json
import os
import pathlib
import struct
import sys
import time
import urllib.error
import urllib.request
import zlib

GATEWAY = "https://ai-gateway.vercel.sh"
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_FILE = REPO_ROOT / ".env.local"
KEY_NAMES = ("AI_GATEWAY_API_KEY", "VERCEL_AI_GATEWAY_API_KEY")

DEFAULT_MODEL = "anthropic/claude-sonnet-4.6"
DEFAULT_SEARCH_MODEL = "openai/gpt-5.4"
DEFAULT_VISION_MODEL = "openai/gpt-4o"

IMAGE_SIZE = 64
REQUEST_TIMEOUT_SECONDS = 120
BODY_PREVIEW_CHARS = 600


def read_env_file() -> dict[str, str]:
    values: dict[str, str] = {}
    if not ENV_FILE.is_file():
        return values

    for line in ENV_FILE.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        name, _, raw = stripped.partition("=")
        values[name.strip()] = raw.strip().strip('"').strip("'")
    return values


def load_setting(env: dict[str, str], name: str, fallback: str) -> str:
    from_env = os.environ.get(name, "").strip()
    if from_env:
        return from_env
    from_file = env.get(name, "").strip()
    return from_file or fallback


def load_api_key(env: dict[str, str]) -> tuple[str | None, str | None]:
    for name in KEY_NAMES:
        value = os.environ.get(name, "").strip()
        if value:
            return value, f"env {name}"

    for name in KEY_NAMES:
        value = env.get(name, "").strip()
        if value:
            return value, str(ENV_FILE)
    return None, None


def request(api_key: str, method: str, path: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode() if payload is not None else None
    http_request = urllib.request.Request(GATEWAY + path, data=data, method=method)
    http_request.add_header("Authorization", f"Bearer {api_key}")
    http_request.add_header("Content-Type", "application/json")

    started = time.time()
    try:
        with urllib.request.urlopen(http_request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8", "replace")
            status = response.status
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        status = exc.code
    except urllib.error.URLError as exc:
        return {"status": None, "body": None, "raw": f"transport error: {exc.reason}", "ms": 0}

    elapsed_ms = int((time.time() - started) * 1000)
    try:
        body = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        body = None

    return {"status": status, "body": body, "raw": raw, "ms": elapsed_ms}


def print_result(label: str, result: dict) -> bool:
    status = result.get("status")
    ok = status is not None and 200 <= status < 300
    print(f"[{'OK ' if ok else 'ERR'}] {label} -> HTTP {status} ({result.get('ms', 0)}ms)")
    if not ok:
        print(f"        body: {result.get('raw', '')[:BODY_PREVIEW_CHARS]}")
    return ok


def usage_line(body, prompt_key: str = "prompt_tokens", completion_key: str = "completion_tokens") -> str:
    if not isinstance(body, dict):
        return ""
    usage = body.get("usage") or {}
    if not usage:
        return ""
    prompt = usage.get(prompt_key, usage.get("input_tokens"))
    completion = usage.get(completion_key, usage.get("output_tokens"))
    cost = usage.get("cost")
    parts = [f"prompt={prompt}", f"completion={completion}"]
    if cost is not None:
        parts.append(f"cost=${cost}")
    return "        tokens: " + " ".join(parts)


def build_test_png() -> bytes:
    """A small synthetic canvas with a solid orange disc, used for the vision check."""
    centre = (IMAGE_SIZE - 1) / 2
    radius = IMAGE_SIZE / 3

    rows = []
    for y in range(IMAGE_SIZE):
        row = bytearray([0])  # PNG filter type 0 (None)
        for x in range(IMAGE_SIZE):
            inside = (x - centre) ** 2 + (y - centre) ** 2 <= radius**2
            row.extend((240, 120, 20) if inside else (245, 245, 245))
        rows.append(bytes(row))

    def chunk(tag: bytes, payload: bytes) -> bytes:
        body = tag + payload
        return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", IMAGE_SIZE, IMAGE_SIZE, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
        + chunk(b"IEND", b"")
    )


def check_models(api_key: str, wanted: list[str]) -> bool:
    result = request(api_key, "GET", "/v1/models")
    if not print_result("GET /v1/models", result):
        return False

    body = result.get("body") or {}
    entries = body.get("data") if isinstance(body, dict) else None
    if not isinstance(entries, list):
        print(f"        unexpected body: {str(body)[:BODY_PREVIEW_CHARS]}")
        return False

    model_ids = [entry.get("id") for entry in entries if isinstance(entry, dict)]
    print(f"        {len(model_ids)} models advertised")
    missing = []
    for model in wanted:
        available = model in model_ids
        print(f"        advertises {model}: {available}")
        if not available:
            missing.append(model)
    return not missing


def check_text_completion(api_key: str, model: str) -> bool:
    result = request(
        api_key,
        "POST",
        "/v1/chat/completions",
        {
            "model": model,
            "max_tokens": 16,
            "messages": [{"role": "user", "content": "Reply with the single word: ok"}],
        },
    )
    if not print_result(f"POST /v1/chat/completions ({model})", result):
        return False

    body = result.get("body") or {}
    choices = body.get("choices") if isinstance(body, dict) else None
    if choices:
        reply = choices[0].get("message", {}).get("content", "")
        print(f"        reply: {str(reply)[:120]}")
    tokens = usage_line(body)
    if tokens:
        print(tokens)
    return True


def check_responses(api_key: str, model: str) -> bool:
    result = request(
        api_key,
        "POST",
        "/v1/responses",
        {
            "model": model,
            "input": [{"type": "message", "role": "user", "content": "Reply with the single word: ok"}],
        },
    )
    if not print_result(f"POST /v1/responses ({model})", result):
        return False

    body = result.get("body") or {}
    if isinstance(body, dict):
        print(f"        status: {body.get('status')}")
    tokens = usage_line(body, "input_tokens", "output_tokens")
    if tokens:
        print(tokens)
    return True


def check_vision(api_key: str, model: str) -> bool:
    image_b64 = base64.b64encode(build_test_png()).decode()
    result = request(
        api_key,
        "POST",
        "/v1/chat/completions",
        {
            "model": model,
            "max_tokens": 40,
            "temperature": 0.1,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "What shape and colour is in this image? Answer in five words or fewer.",
                        },
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}},
                    ],
                }
            ],
        },
    )
    if not print_result(f"POST /v1/chat/completions image ({model})", result):
        return False

    body = result.get("body") or {}
    choices = body.get("choices") if isinstance(body, dict) else None
    if choices:
        reading = choices[0].get("message", {}).get("content", "")
        print(f"        model saw: {str(reading)[:120]}")
    tokens = usage_line(body)
    if tokens:
        print(tokens)
    return True


def main() -> int:
    env = read_env_file()
    api_key, source = load_api_key(env)
    if not api_key:
        print("AI_GATEWAY_API_KEY not found in the environment or in .env.local")
        return 1

    text_model = load_setting(env, "AI_GATEWAY_MODEL", DEFAULT_MODEL)
    search_model = load_setting(env, "AI_GATEWAY_SEARCH_MODEL", DEFAULT_SEARCH_MODEL)
    vision_model = load_setting(env, "AI_GATEWAY_VISION_MODEL", DEFAULT_VISION_MODEL)

    print(f"key source : {source}")
    print(f"key shape  : {len(api_key)} chars, prefix {api_key[:8]}...")
    print(f"models     : text={text_model}")
    print(f"             search={search_model}")
    print(f"             vision={vision_model}")
    print("")

    checks = [
        ("models", check_models(api_key, [text_model, search_model, vision_model])),
        ("chat.completions", check_text_completion(api_key, text_model)),
        ("responses", check_responses(api_key, text_model)),
        ("vision", check_vision(api_key, vision_model)),
    ]

    failed = [name for name, passed in checks if not passed]
    print("")
    if failed:
        print(f"FAILED: {', '.join(failed)}")
        return 1

    print("AI Gateway key is valid: every check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
