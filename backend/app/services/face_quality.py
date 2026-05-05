"""
Quality gate and optional alignment for realtime frames using dlib landmarks.
"""
from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class FaceQualityGate:
    def __init__(
        self,
        predictor_path: Path,
        enable_quality: bool,
        enable_alignment: bool,
        min_brightness: float,
        max_brightness: float,
        min_sharpness: float,
        max_roll_deg: float,
        min_face_size: int,
    ) -> None:
        self.predictor_path = predictor_path
        self.enable_quality = enable_quality
        self.enable_alignment = enable_alignment
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness
        self.min_sharpness = min_sharpness
        self.max_roll_deg = max_roll_deg
        self.min_face_size = min_face_size

        self._detector = None
        self._predictor = None
        self._ready = False

    def load(self) -> None:
        if not (self.enable_quality or self.enable_alignment):
            logger.info("FaceQualityGate disabled by settings")
            return

        try:
            import dlib  # type: ignore
        except Exception as e:
            logger.warning(f"dlib not available: {e}")
            return

        if not self.predictor_path.exists():
            logger.warning(f"Landmark model not found: {self.predictor_path}")
            return

        self._detector = dlib.get_frontal_face_detector()
        self._predictor = dlib.shape_predictor(str(self.predictor_path))
        self._ready = True
        logger.info("FaceQualityGate ready")

    @property
    def ready(self) -> bool:
        return self._ready

    def _eye_center(self, landmarks: Any, idxs: List[int]) -> Tuple[float, float]:
        xs = [landmarks.part(i).x for i in idxs]
        ys = [landmarks.part(i).y for i in idxs]
        return float(sum(xs)) / len(xs), float(sum(ys)) / len(ys)

    def _estimate_roll(self, landmarks: Any) -> float:
        left_eye = self._eye_center(landmarks, list(range(36, 42)))
        right_eye = self._eye_center(landmarks, list(range(42, 48)))
        dy = right_eye[1] - left_eye[1]
        dx = right_eye[0] - left_eye[0]
        if dx == 0:
            return 0.0
        return math.degrees(math.atan2(dy, dx))

    def assess_and_align(self, frame_bgr: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any] | None]:
        if not self._ready:
            return frame_bgr, None

        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        faces = self._detector(gray, 0)
        if not faces:
            if self.enable_quality:
                return frame_bgr, {
                    "passed": False,
                    "reason": "no_face",
                    "brightness": brightness,
                    "sharpness": sharpness,
                }
            return frame_bgr, {
                "passed": True,
                "reason": "no_face",
                "brightness": brightness,
                "sharpness": sharpness,
            }

        rolls: List[float] = []
        for face in faces:
            w = face.right() - face.left()
            h = face.bottom() - face.top()
            if self.enable_quality and (w < self.min_face_size or h < self.min_face_size):
                return frame_bgr, {
                    "passed": False,
                    "reason": "face_too_small",
                    "brightness": brightness,
                    "sharpness": sharpness,
                    "faces": len(faces),
                }
            landmarks = self._predictor(gray, face)
            rolls.append(self._estimate_roll(landmarks))

        max_roll = max(abs(r) for r in rolls) if rolls else 0.0
        if self.enable_quality:
            if brightness < self.min_brightness or brightness > self.max_brightness:
                return frame_bgr, {
                    "passed": False,
                    "reason": "bad_brightness",
                    "brightness": brightness,
                    "sharpness": sharpness,
                    "max_roll": max_roll,
                    "faces": len(faces),
                }
            if sharpness < self.min_sharpness:
                return frame_bgr, {
                    "passed": False,
                    "reason": "too_blurry",
                    "brightness": brightness,
                    "sharpness": sharpness,
                    "max_roll": max_roll,
                    "faces": len(faces),
                }
            if max_roll > self.max_roll_deg:
                return frame_bgr, {
                    "passed": False,
                    "reason": "bad_angle",
                    "brightness": brightness,
                    "sharpness": sharpness,
                    "max_roll": max_roll,
                    "faces": len(faces),
                }

        aligned = False
        out = frame_bgr
        if self.enable_alignment and rolls:
            angle = float(sum(rolls)) / len(rolls)
            if abs(angle) > 1.0:
                h, w = frame_bgr.shape[:2]
                center = (w / 2.0, h / 2.0)
                m = cv2.getRotationMatrix2D(center, angle, 1.0)
                out = cv2.warpAffine(frame_bgr, m, (w, h), flags=cv2.INTER_LINEAR)
                aligned = True

        return out, {
            "passed": True,
            "brightness": brightness,
            "sharpness": sharpness,
            "max_roll": max_roll,
            "faces": len(faces),
            "aligned": aligned,
        }


face_quality_gate = FaceQualityGate(
    predictor_path=settings.landmark_model_abs_path,
    enable_quality=settings.REALTIME_QUALITY_ENABLE,
    enable_alignment=settings.REALTIME_ALIGNMENT_ENABLE,
    min_brightness=settings.REALTIME_MIN_BRIGHTNESS,
    max_brightness=settings.REALTIME_MAX_BRIGHTNESS,
    min_sharpness=settings.REALTIME_MIN_SHARPNESS,
    max_roll_deg=settings.REALTIME_MAX_ROLL_DEG,
    min_face_size=settings.REALTIME_MIN_FACE_SIZE,
)
