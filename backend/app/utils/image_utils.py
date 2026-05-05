"""
Image / base64 helpers.
"""
from __future__ import annotations

import base64
from io import BytesIO
from typing import Tuple

import cv2
import numpy as np
from PIL import Image


def decode_base64_image(data: str) -> np.ndarray:
    """
    Decode a base64 string (with or without 'data:image/...;base64,' prefix)
    into a BGR numpy array.
    """
    if "," in data and data.strip().startswith("data:"):
        data = data.split(",", 1)[1]
    try:
        raw = base64.b64decode(data)
    except Exception as e:
        raise ValueError(f"Invalid base64 image: {e}")

    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        # fallback via PIL
        try:
            pil = Image.open(BytesIO(raw)).convert("RGB")
            img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
        except Exception as e:
            raise ValueError(f"Could not decode image: {e}")
    return img


def encode_image_to_base64(frame_bgr: np.ndarray, fmt: str = ".jpg", quality: int = 85) -> str:
    """Encode a BGR frame to a base64 data URL string."""
    params = []
    if fmt.lower() in (".jpg", ".jpeg"):
        params = [cv2.IMWRITE_JPEG_QUALITY, quality]
        mime = "image/jpeg"
    elif fmt.lower() == ".png":
        params = [cv2.IMWRITE_PNG_COMPRESSION, 3]
        mime = "image/png"
    else:
        fmt = ".jpg"
        mime = "image/jpeg"

    ok, buf = cv2.imencode(fmt, frame_bgr, params)
    if not ok:
        raise RuntimeError("Failed to encode image")
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def read_image_bytes(data: bytes) -> np.ndarray:
    """Decode raw image bytes (from upload) into BGR numpy."""
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image bytes")
    return img


def resize_max(frame_bgr: np.ndarray, max_side: int = 960) -> Tuple[np.ndarray, float]:
    """Resize so that max(width, height) == max_side. Returns (resized, scale)."""
    h, w = frame_bgr.shape[:2]
    m = max(h, w)
    if m <= max_side:
        return frame_bgr, 1.0
    scale = max_side / m
    return cv2.resize(frame_bgr, (int(w * scale), int(h * scale))), scale
