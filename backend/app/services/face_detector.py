"""
Face detector service using Ultralytics YOLO.

Loads a .pt model (e.g. best.pt) once at startup, and provides helpers
to run inference on frames (numpy BGR arrays).
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class FaceDetector:
    def __init__(self, model_path: Path, student_map_path: Path, conf_threshold: float = 0.7):
        self.model_path = model_path
        self.student_map_path = student_map_path
        self.conf_threshold = conf_threshold

        self._model = None
        self._class_names: Dict[int, str] = {}
        self._student_map: Dict[str, str] = {}

    # ---------------------- lifecycle ----------------------
    def load(self) -> None:
        """Load YOLO model + student mapping."""
        from ultralytics import YOLO  # lazy import to avoid heavy startup cost when unused

        if not self.model_path.exists():
            raise FileNotFoundError(f"Model file not found: {self.model_path}")

        logger.info(f"Loading YOLO model from {self.model_path}")
        self._model = YOLO(str(self.model_path))

        # class names (dict: id -> name)
        names = getattr(self._model, "names", {}) or {}
        if isinstance(names, list):
            names = {i: n for i, n in enumerate(names)}
        self._class_names = names
        logger.info(f"Model classes: {self._class_names}")

        # student mapping
        if self.student_map_path.exists():
            try:
                raw = json.loads(self.student_map_path.read_text(encoding="utf-8"))
                # drop comment keys
                self._student_map = {
                    str(k): str(v) for k, v in raw.items() if not str(k).startswith("_")
                }
                logger.info(f"Loaded student map with {len(self._student_map)} entries")
            except Exception as e:
                logger.error(f"Failed to load student map: {e}")
                self._student_map = {}
        else:
            logger.warning(
                f"Student map not found at {self.student_map_path}. Class labels will be used as student_id."
            )

    # ---------------------- helpers ----------------------
    def _resolve_student_id(self, cls_idx: int, cls_name: str) -> str:
        """Resolve student_id from class index or name via mapping file."""
        # Prefer numeric index key
        if str(cls_idx) in self._student_map:
            return self._student_map[str(cls_idx)]
        if cls_name in self._student_map:
            return self._student_map[cls_name]
        # fallback: use class name itself as student_id
        return cls_name

    # ---------------------- inference ----------------------
    def predict(self, frame_bgr: np.ndarray) -> List[dict]:
        """
        Run inference on a BGR frame.
        Returns list of detection dicts:
            { "student_id", "name", "confidence", "bbox": [x1, y1, x2, y2] }
        """
        if self._model is None:
            raise RuntimeError("Model is not loaded")

        results = self._model.predict(
            source=frame_bgr,
            conf=self.conf_threshold,
            verbose=False,
        )

        detections: List[dict] = []
        if not results:
            return detections

        r = results[0]
        if r.boxes is None or len(r.boxes) == 0:
            return detections

        boxes_xyxy = r.boxes.xyxy.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()
        clss = r.boxes.cls.cpu().numpy().astype(int)

        for (x1, y1, x2, y2), conf, cls in zip(boxes_xyxy, confs, clss):
            cls_name = self._class_names.get(int(cls), str(cls))
            student_id = self._resolve_student_id(int(cls), cls_name)
            detections.append(
                {
                    "student_id": student_id,
                    "name": cls_name,  # will be overridden by DB name if available
                    "confidence": float(conf),
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                }
            )
        return detections

    # ---------------------- drawing ----------------------
    @staticmethod
    def draw_detections(
        frame_bgr: np.ndarray, detections: List[dict], label_override: Dict[str, str] | None = None
    ) -> np.ndarray:
        """Draw bounding boxes + labels on a copy of the frame."""
        out = frame_bgr.copy()
        label_override = label_override or {}

        for det in detections:
            x1, y1, x2, y2 = map(int, det["bbox"])
            sid = det["student_id"]
            name = label_override.get(sid, det.get("name", sid))
            conf = det["confidence"]

            # Gradient-ish colors (BGR)
            color = (255, 128, 64)  # soft blue-purple
            cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)

            label = f"{sid} | {name} {conf:.2f}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            cv2.rectangle(out, (x1, y1 - th - 10), (x1 + tw + 10, y1), color, -1)
            cv2.putText(
                out,
                label,
                (x1 + 5, y1 - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )
        return out


# Singleton instance
face_detector = FaceDetector(
    model_path=settings.model_abs_path,
    student_map_path=settings.student_map_abs_path,
    conf_threshold=settings.CONFIDENCE_THRESHOLD,
)
