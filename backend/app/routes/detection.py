"""
Upload-based detection routes (image + video).
"""
from __future__ import annotations

import os
import time
import uuid
from pathlib import Path
from typing import Dict, List

import cv2
from fastapi import APIRouter, File, HTTPException, UploadFile, Response

from app.config import settings
from app.database import get_db
from app.services.face_detector import face_detector
from app.services.track_voter import TrackVoter
from app.utils.image_utils import (
    encode_image_to_base64,
    read_image_bytes,
    resize_max,
)

router = APIRouter(prefix="/api/detect", tags=["detection"])

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
ALLOWED_VIDEO_EXT = {".mp4", ".avi", ".mov", ".mkv", ".webm"}


async def _enrich_names(detections: List[dict]) -> List[dict]:
    """Replace `name` with full_name from DB when student_id matches."""
    if not detections:
        return detections
    db = get_db()
    ids = list({d["student_id"] for d in detections})
    cursor = db["students"].find({"student_id": {"$in": ids}}, {"student_id": 1, "full_name": 1})
    mapping: Dict[str, str] = {}
    async for doc in cursor:
        mapping[doc["student_id"]] = doc.get("full_name", "")
    for d in detections:
        if mapping.get(d["student_id"]):
            d["name"] = mapping[d["student_id"]]
    return detections


@router.post("/image")
async def detect_image(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(400, f"Unsupported image extension: {ext}")

    raw = await file.read()
    if len(raw) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, "File too large")

    img = read_image_bytes(raw)
    img, _scale = resize_max(img, 1280)

    t0 = time.perf_counter()
    detections = face_detector.predict(img)
    detections = await _enrich_names(detections)
    name_map = {d["student_id"]: d["name"] for d in detections}
    drawn = face_detector.draw_detections(img, detections, label_override=name_map)
    t1 = time.perf_counter()

    result_b64 = encode_image_to_base64(drawn, fmt=".jpg", quality=85)
    return {
        "result_media": result_b64,
        "media_type": "image",
        "detections": detections,
        "processing_time_ms": round((t1 - t0) * 1000, 2),
    }


@router.post("/video")
async def detect_video(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXT:
        raise HTTPException(400, f"Unsupported video extension: {ext}")

    raw = await file.read()
    if len(raw) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, "File too large")

    # Save input
    uid = uuid.uuid4().hex
    in_path = settings.upload_abs_dir / f"in_{uid}{ext}"
    out_path = settings.upload_abs_dir / f"out_{uid}.mp4"
    in_path.write_bytes(raw)

    cap = cv2.VideoCapture(str(in_path))
    if not cap.isOpened():
        raise HTTPException(400, "Could not open video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(out_path), fourcc, fps, (width, height))

    unique_dets: Dict[str, dict] = {}
    track_voter = TrackVoter(
        iou_threshold=settings.VIDEO_TRACK_IOU,
        max_age=settings.VIDEO_TRACK_MAX_AGE,
        min_hits=settings.VIDEO_TRACK_MIN_HITS,
    )
    t0 = time.perf_counter()
    frame_idx = 0
    process_every = 5  # skip 4 frames, process 1 (increased from 2 for faster processing)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_idx += 1

            if frame_idx % process_every == 0:
                dets = face_detector.predict(frame)
                if settings.VIDEO_TRACKING_ENABLE:
                    dets = track_voter.update(dets)
                drawn = face_detector.draw_detections(frame, dets)
                if not settings.VIDEO_TRACKING_ENABLE:
                    for d in dets:
                        sid = d["student_id"]
                        if sid not in unique_dets or d["confidence"] > unique_dets[sid]["confidence"]:
                            unique_dets[sid] = d
            else:
                drawn = frame

            writer.write(drawn)
    finally:
        cap.release()
        writer.release()

    t1 = time.perf_counter()

    if settings.VIDEO_TRACKING_ENABLE:
        detections = track_voter.summary()
    else:
        detections = list(unique_dets.values())
    detections = await _enrich_names(detections)

    # Remove input file
    try:
        os.remove(in_path)
    except OSError:
        pass

    # Return processed video as static URL (served by main.py mount)
    media_url = f"/uploads/{out_path.name}"
    return {
        "result_media": media_url,
        "media_type": "video",
        "detections": detections,
        "processing_time_ms": round((t1 - t0) * 1000, 2),
    }
