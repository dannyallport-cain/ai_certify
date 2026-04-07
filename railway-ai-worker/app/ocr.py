from __future__ import annotations

import base64
import binascii
import io
import re
from typing import Any

import cv2
import httpx
import numpy as np
import pytesseract
from PIL import Image, ImageOps


DEFAULT_TEXT_LINES: list[str] = []
DEFAULT_QUALITY_SUMMARY: dict[str, Any] = {
    "status": "unavailable",
    "width": 0,
    "height": 0,
    "mode": "unknown",
    "brightness": 0.0,
    "contrast": 0.0,
    "sharpness": 0.0,
    "isBlurry": True,
    "isDark": True,
    "isLowContrast": True,
    "notes": ["image-unavailable"],
}


def fetch_image_bytes(image_url: str, timeout_seconds: float = 15.0, max_bytes: int = 10 * 1024 * 1024) -> bytes:
    if not image_url or not isinstance(image_url, str):
        return b""

    try:
        with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
            response = client.get(image_url)
            response.raise_for_status()
            content = response.content or b""
            if len(content) > max_bytes:
                return b""
            return content
    except Exception:
        return b""


def decode_base64_image(image_base64: str) -> bytes:
    if not image_base64 or not isinstance(image_base64, str):
        return b""

    payload = image_base64.strip()
    if "," in payload and payload.lower().startswith("data:"):
        payload = payload.split(",", 1)[1]

    payload = re.sub(r"\s+", "", payload)

    try:
        return base64.b64decode(payload, validate=False)
    except (ValueError, binascii.Error):
        return b""


def load_image(image_bytes: bytes) -> Image.Image | None:
    if not image_bytes:
        return None

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        return image
    except Exception:
        return None


def pil_image_to_bgr_array(image: Image.Image | None) -> np.ndarray | None:
    if image is None:
        return None

    try:
        rgb_image = image.convert("RGB")
        rgb_array = np.array(rgb_image)
        return cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
    except Exception:
        return None


def preprocess_for_ocr(image: Image.Image | None) -> list[np.ndarray]:
    bgr = pil_image_to_bgr_array(image)
    if bgr is None:
        return []

    variants: list[np.ndarray] = []

    try:
        height, width = bgr.shape[:2]
        scale = 1.0
        largest_side = max(height, width)
        if largest_side < 1400:
            scale = min(2.0, 1800.0 / max(largest_side, 1))

        if scale > 1.0:
            resized = cv2.resize(bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        else:
            resized = bgr.copy()

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        variants.append(gray)

        denoised = cv2.GaussianBlur(gray, (3, 3), 0)
        adaptive = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )
        variants.append(adaptive)

        _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        morphed = cv2.morphologyEx(otsu, cv2.MORPH_CLOSE, np.ones((1, 1), np.uint8))
        variants.append(morphed)
    except Exception:
        try:
            variants.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY))
        except Exception:
            return []

    unique_variants: list[np.ndarray] = []
    seen_keys: set[tuple[int, int, int]] = set()

    for variant in variants:
        if variant is None or variant.size == 0:
            continue

        shape = variant.shape
        key = (int(shape[0]), int(shape[1]), int(float(np.mean(variant))))
        if key in seen_keys:
            continue

        seen_keys.add(key)
        unique_variants.append(variant)

    return unique_variants[:3]


def summarize_image_quality(image: Image.Image | None) -> dict[str, Any]:
    if image is None:
        return dict(DEFAULT_QUALITY_SUMMARY)

    try:
        grayscale = ImageOps.grayscale(image)
        arr = np.array(grayscale)
        height, width = arr.shape[:2]

        brightness = float(np.mean(arr))
        contrast = float(np.std(arr))
        sharpness = float(cv2.Laplacian(arr, cv2.CV_64F).var())

        is_blurry = sharpness < 60.0
        is_dark = brightness < 70.0
        is_low_contrast = contrast < 35.0

        notes: list[str] = []
        if is_blurry:
            notes.append("blurry")
        if is_dark:
            notes.append("dark")
        if is_low_contrast:
            notes.append("low-contrast")
        if not notes:
            notes.append("acceptable")

        return {
            "status": "ok",
            "width": int(width),
            "height": int(height),
            "mode": image.mode,
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "sharpness": round(sharpness, 2),
            "isBlurry": is_blurry,
            "isDark": is_dark,
            "isLowContrast": is_low_contrast,
            "notes": notes,
        }
    except Exception:
        return dict(DEFAULT_QUALITY_SUMMARY)


def normalize_text_line(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text or "").strip()
    return normalized.strip("|:;,.").strip()


def deduplicate_text_lines(lines: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []

    for line in lines:
        normalized = normalize_text_line(line)
        if len(normalized) < 2:
            continue

        key = normalized.casefold()
        if key in seen:
            continue

        seen.add(key)
        deduped.append(normalized)

    return deduped


def run_ocr_on_variants(image_variants: list[np.ndarray], tesseract_config: str = "--oem 3 --psm 6") -> list[str]:
    collected_lines: list[str] = []

    for variant in image_variants:
        try:
            text = pytesseract.image_to_string(variant, config=tesseract_config) or ""
        except Exception:
            text = ""

        if not text:
            continue

        collected_lines.extend(line for line in text.splitlines() if line and line.strip())

    return deduplicate_text_lines(collected_lines)


def extract_ocr_text_and_quality(image: Image.Image | None) -> tuple[list[str], dict[str, Any]]:
    quality = summarize_image_quality(image)
    if image is None:
        return list(DEFAULT_TEXT_LINES), quality

    variants = preprocess_for_ocr(image)
    if not variants:
        return list(DEFAULT_TEXT_LINES), quality

    return run_ocr_on_variants(variants), quality


def load_image_from_inputs(image_url: str | None = None, image_base64: str | None = None) -> tuple[Image.Image | None, bytes]:
    image_bytes = b""

    if image_base64:
        image_bytes = decode_base64_image(image_base64)

    if not image_bytes and image_url:
        image_bytes = fetch_image_bytes(image_url)

    return load_image(image_bytes), image_bytes


def ocr_from_inputs(image_url: str | None = None, image_base64: str | None = None) -> dict[str, Any]:
    image, image_bytes = load_image_from_inputs(image_url=image_url, image_base64=image_base64)
    text_lines, quality = extract_ocr_text_and_quality(image)

    return {
        "textLines": text_lines,
        "imageQuality": quality,
        "imageLoaded": image is not None,
        "imageBytesLength": len(image_bytes),
    }