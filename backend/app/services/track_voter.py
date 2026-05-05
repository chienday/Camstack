"""
Lightweight IOU tracker with label voting to stabilize identities across frames.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple


def _iou(a: List[float], b: List[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0

    area_a = max(0.0, (ax2 - ax1)) * max(0.0, (ay2 - ay1))
    area_b = max(0.0, (bx2 - bx1)) * max(0.0, (by2 - by1))
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


@dataclass
class Track:
    track_id: int
    bbox: List[float]
    last_seen: int
    hits: int = 0
    votes: Dict[str, float] = field(default_factory=dict)
    name_map: Dict[str, str] = field(default_factory=dict)

    def update(self, det: dict, frame_index: int) -> None:
        self.bbox = det["bbox"]
        self.last_seen = frame_index
        self.hits += 1
        sid = det["student_id"]
        self.votes[sid] = self.votes.get(sid, 0.0) + float(det.get("confidence", 0.0))
        self.name_map[sid] = det.get("name", sid)

    def best_label(self) -> Tuple[str, str, float]:
        if not self.votes:
            return "unknown", "unknown", 0.0
        sid = max(self.votes.items(), key=lambda kv: kv[1])[0]
        return sid, self.name_map.get(sid, sid), float(self.votes[sid])

    def to_detection(self) -> dict:
        sid, name, score = self.best_label()
        avg_conf = score / max(self.hits, 1)
        return {
            "student_id": sid,
            "name": name,
            "confidence": float(avg_conf),
            "bbox": self.bbox,
        }


class TrackVoter:
    def __init__(self, iou_threshold: float = 0.3, max_age: int = 10, min_hits: int = 3) -> None:
        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self.min_hits = min_hits
        self._frame_index = 0
        self._next_id = 1
        self._tracks: Dict[int, Track] = {}

    def _match(self, detections: List[dict]) -> Dict[int, int]:
        """Return mapping det_idx -> track_id."""
        if not self._tracks or not detections:
            return {}

        matches: Dict[int, int] = {}
        used_tracks = set()

        for det_idx, det in enumerate(detections):
            best_iou = 0.0
            best_tid = None
            for tid, track in self._tracks.items():
                if tid in used_tracks:
                    continue
                score = _iou(det["bbox"], track.bbox)
                if score > best_iou:
                    best_iou = score
                    best_tid = tid
            if best_tid is not None and best_iou >= self.iou_threshold:
                matches[det_idx] = best_tid
                used_tracks.add(best_tid)

        return matches

    def update(self, detections: List[dict]) -> List[dict]:
        self._frame_index += 1

        matches = self._match(detections)
        det_to_track: Dict[int, int] = dict(matches)

        # Update matched tracks
        for det_idx, tid in matches.items():
            self._tracks[tid].update(detections[det_idx], self._frame_index)

        # Create new tracks for unmatched detections
        for idx, det in enumerate(detections):
            if idx in matches:
                continue
            tid = self._next_id
            self._next_id += 1
            track = Track(track_id=tid, bbox=det["bbox"], last_seen=self._frame_index)
            track.update(det, self._frame_index)
            self._tracks[tid] = track
            det_to_track[idx] = tid

        # Drop stale tracks
        stale = [
            tid
            for tid, t in self._tracks.items()
            if self._frame_index - t.last_seen > self.max_age
        ]
        for tid in stale:
            del self._tracks[tid]

        # Return detections with voted labels for active tracks
        stabilized: List[dict] = []
        for det_idx, det in enumerate(detections):
            tid = det_to_track.get(det_idx)
            track = self._tracks.get(tid)
            if track is None:
                stabilized.append(det)
                continue
            sid, name, _score = track.best_label()
            det = det.copy()
            det["student_id"] = sid
            det["name"] = name
            stabilized.append(det)

        return stabilized

    def summary(self) -> List[dict]:
        """Return a summary detection per track after processing all frames."""
        results: List[dict] = []
        for track in self._tracks.values():
            if track.hits < self.min_hits:
                continue
            results.append(track.to_detection())
        return results
