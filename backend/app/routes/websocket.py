"""
WebSocket endpoint for real-time face-recognition attendance.

Client connects to:  ws://<host>/ws/attendance/{session_id}
Client sends JSON:  { "type": "frame", "frame": "<base64 data url>" }
Server responds:    {
    "type": "frame_result",
    "frame": "<base64 processed frame>",
    "detections": [...],
    "new_attendance": {...} | null,
    "total_attended": int,
    "attended_list": [ {student_id, name, check_in_time, confidence}, ... ]
}
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from typing import Dict

from bson import ObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import get_db
from app.config import settings
from app.services.face_detector import face_detector
from app.services.face_quality import face_quality_gate
from app.services.track_voter import TrackVoter
from app.services.tracker import attendance_tracker
from app.utils.image_utils import decode_base64_image, encode_image_to_base64, resize_max

logger = logging.getLogger(__name__)
router = APIRouter()


# Student name cache - per session, expires after 5 minutes
_name_cache: Dict[str, tuple[Dict[str, str], float]] = {}

async def _get_student_name_map(student_ids: list[str], session_id: str) -> Dict[str, str]:
    """Get student names with caching to reduce DB queries."""
    import time
    
    if not student_ids:
        return {}
    
    # Check cache validity (5 min TTL)
    now = time.time()
    if session_id in _name_cache:
        cache_data, ts = _name_cache[session_id]
        if now - ts < 300:  # 5 minutes
            # Return cached + any missing
            result = cache_data.copy()
            missing = [sid for sid in student_ids if sid not in result]
            if not missing:
                return result
            # Load only missing ones
            student_ids = missing
        else:
            # Cache expired, clear it
            del _name_cache[session_id]
    
    if not student_ids:
        return {}
        
    db = get_db()
    mapping: Dict[str, str] = {}
    cursor = db["students"].find(
        {"student_id": {"$in": student_ids}}, {"student_id": 1, "full_name": 1}
    )
    async for doc in cursor:
        mapping[doc["student_id"]] = doc.get("full_name", "")
    
    # Update cache
    if session_id in _name_cache:
        cache_data, _ = _name_cache[session_id]
        cache_data.update(mapping)
        _name_cache[session_id] = (cache_data, now)
    else:
        _name_cache[session_id] = (mapping, now)
    
    return _name_cache[session_id][0]


@router.websocket("/ws/attendance/{session_id}")
async def ws_attendance(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected: session={session_id}")

    track_voter = TrackVoter(
        iou_threshold=settings.REALTIME_TRACK_IOU,
        max_age=settings.REALTIME_TRACK_MAX_AGE,
        min_hits=settings.REALTIME_TRACK_MIN_HITS,
    )

    # make sure session exists in DB (soft-check)
    db = get_db()
    try:
        oid = ObjectId(session_id)
        session_doc = await db["attendance_sessions"].find_one({"_id": oid})
    except Exception:
        session_doc = None

    if not session_doc:
        await websocket.send_text(
            json.dumps({"type": "error", "message": f"Session {session_id} not found"})
        )
        await websocket.close()
        return

    attendance_tracker.start_session(session_id)
    processing = False  # Flag to skip frames while processing

    try:
        while True:
            raw = await websocket.receive_text()
            
            # Skip frame if still processing previous one (prevent frame pileup)
            if processing:
                logger.debug("Skipping frame - still processing")
                continue
            
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON"}))
                continue

            mtype = msg.get("type")
            if mtype == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            if mtype != "frame":
                await websocket.send_text(
                    json.dumps({"type": "error", "message": f"Unknown message type: {mtype}"})
                )
                continue

            frame_b64 = msg.get("frame")
            if not frame_b64:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Missing frame payload"})
                )
                continue

            processing = True
            try:
                # decode
                try:
                    frame = decode_base64_image(frame_b64)
                except Exception as e:
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": f"Decode error: {e}"})
                    )
                    continue

                # downscale to speed up inference (reduce from 720 to 480 max for faster processing)
                frame, _ = resize_max(frame, 480)

                quality = None
                if face_quality_gate.ready:
                    frame, quality = face_quality_gate.assess_and_align(frame)
                    if quality is not None and not quality.get("passed", True):
                        frame_out = encode_image_to_base64(frame, fmt=".jpg", quality=50)
                        state = attendance_tracker.get(session_id)
                        resp = {
                            "type": "frame_result",
                            "frame": frame_out,
                            "detections": [],
                            "new_attendance": None,
                            "total_attended": state.total_attended(),
                            "attended_list": state.attended_list(),
                            "quality": quality,
                        }
                        await websocket.send_text(json.dumps(resp))
                        continue

                # inference
                detections = face_detector.predict(frame)

                # enrich names from DB (with caching)
                name_map = await _get_student_name_map([d["student_id"] for d in detections], session_id)
                for d in detections:
                    if name_map.get(d["student_id"]):
                        d["name"] = name_map[d["student_id"]]

                # tracking + voting to stabilize identities across frames
                if settings.REALTIME_TRACKING_ENABLE:
                    detections = track_voter.update(detections)

                # consecutive-frame confirmation
                confirmed = attendance_tracker.process_detections(session_id, detections)

                # persist newly confirmed attendance
                new_attendance_payload = None
                if confirmed:
                    state = attendance_tracker.get(session_id)
                    for c in confirmed:
                        sid = c["student_id"]
                        if state.is_attended(sid):
                            continue
                        now = datetime.utcnow()
                        record = {
                            "session_id": session_id,
                            "student_id": sid,
                            "student_name": c["name"],
                            "check_in_time": now,
                            "confidence": float(c["confidence"]),
                            "method": "realtime",
                        }
                        try:
                            await db["attendance_records"].insert_one(record)
                        except Exception as e:
                            # duplicate key (already recorded) — ignore
                            logger.warning(f"Insert record skipped: {e}")

                        state_record = {
                            "student_id": sid,
                            "name": c["name"],
                            "check_in_time": now.isoformat(),
                            "confidence": float(c["confidence"]),
                        }
                        attendance_tracker.register_attendance(session_id, sid, state_record)

                        # last newly-attended becomes the "announced" one
                        new_attendance_payload = {
                            "student_id": sid,
                            "name": c["name"],
                            "time": now.strftime("%H:%M:%S"),
                            "confidence": float(c["confidence"]),
                        }

                    # update session attended_count
                    await db["attendance_sessions"].update_one(
                        {"_id": oid},
                        {"$set": {"attended_count": attendance_tracker.get(session_id).total_attended()}},
                    )

                # draw frame with labels (override name from db map) - reduce quality for faster encoding
                drawn = face_detector.draw_detections(
                    frame, detections, label_override={d["student_id"]: d["name"] for d in detections}
                )
                frame_out = encode_image_to_base64(drawn, fmt=".jpg", quality=50)

                state = attendance_tracker.get(session_id)
                resp = {
                    "type": "frame_result",
                    "frame": frame_out,
                    "detections": detections,
                    "new_attendance": new_attendance_payload,
                    "total_attended": state.total_attended(),
                    "attended_list": state.attended_list(),
                    "quality": quality,
                }
                await websocket.send_text(json.dumps(resp))
            finally:
                processing = False
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")
        # Clean up cache for this session
        if session_id in _name_cache:
            del _name_cache[session_id]
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        # Clean up cache
        if session_id in _name_cache:
            del _name_cache[session_id]
        try:
            await websocket.close()
        except Exception:
            pass
