"""
Attendance tracker service.

For a given realtime session, keeps track of:
- which student_ids have already been attended (never count twice)
- consecutive frame counters for each candidate student_id (to avoid false positives)

Only after a student has been detected in N consecutive frames
(with confidence >= threshold) is the attendance finalized.
"""
from __future__ import annotations

import threading
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Set


@dataclass
class SessionState:
    session_id: str
    attended: Dict[str, dict] = field(default_factory=dict)  # student_id -> record
    consecutive: Dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def is_attended(self, student_id: str) -> bool:
        return student_id in self.attended

    def total_attended(self) -> int:
        return len(self.attended)

    def attended_list(self) -> List[dict]:
        # return sorted by check_in_time ascending
        return sorted(self.attended.values(), key=lambda r: r.get("check_in_time", ""))


class AttendanceTracker:
    """
    Thread-safe, in-memory tracker keyed by session_id.
    """

    def __init__(self, confirmation_frames: int = 3):
        self.confirmation_frames = confirmation_frames
        self._sessions: Dict[str, SessionState] = {}
        self._lock = threading.Lock()

    # --------------- session management ---------------
    def start_session(self, session_id: str) -> SessionState:
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = SessionState(session_id=session_id)
            return self._sessions[session_id]

    def end_session(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def get(self, session_id: str) -> SessionState:
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = SessionState(session_id=session_id)
            return self._sessions[session_id]

    # --------------- frame processing ---------------
    def process_detections(
        self,
        session_id: str,
        detections: List[dict],
    ) -> List[dict]:
        """
        Update consecutive counters and return newly confirmed attendance entries.

        `detections` expected items: {"student_id", "name", "confidence", "bbox"}.

        Returns list of dicts for students just confirmed in this frame:
            {"student_id", "name", "confidence"}
        """
        state = self.get(session_id)
        seen_ids: Set[str] = set()
        newly_confirmed: List[dict] = []

        with self._lock:
            for det in detections:
                sid = det["student_id"]
                seen_ids.add(sid)

                if state.is_attended(sid):
                    continue

                state.consecutive[sid] += 1
                if state.consecutive[sid] >= self.confirmation_frames:
                    newly_confirmed.append(
                        {
                            "student_id": sid,
                            "name": det.get("name", sid),
                            "confidence": float(det["confidence"]),
                        }
                    )

            # Reset counters for ids not seen in this frame
            for sid in list(state.consecutive.keys()):
                if sid not in seen_ids:
                    state.consecutive[sid] = 0

        return newly_confirmed

    def register_attendance(
        self,
        session_id: str,
        student_id: str,
        record: dict,
    ) -> bool:
        """Mark a student as attended. Returns True if newly added."""
        state = self.get(session_id)
        with self._lock:
            if state.is_attended(student_id):
                return False
            state.attended[student_id] = record
            state.consecutive[student_id] = 0
            return True


# Singleton
from app.config import settings as _settings

attendance_tracker = AttendanceTracker(confirmation_frames=_settings.CONFIRMATION_FRAMES)
