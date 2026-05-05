"""
Pydantic schemas for Attendance Records and Detection results.
"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class Detection(BaseModel):
    student_id: str
    name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]


class DetectionResponse(BaseModel):
    result_media: str  # base64 string (image) OR URL
    media_type: Literal["image", "video"]
    detections: List[Detection]
    processing_time_ms: float


class AttendanceRecordOut(BaseModel):
    id: str = Field(..., alias="_id")
    session_id: str
    student_id: str
    student_name: str
    check_in_time: datetime
    confidence: float
    method: Literal["realtime", "upload_image", "upload_video"]

    model_config = {"populate_by_name": True}


class RealtimeMessage(BaseModel):
    """Message structure received over WebSocket from client."""
    type: Literal["frame", "ping"]
    frame: Optional[str] = None  # base64 data URL or raw b64


class RealtimeNewAttendance(BaseModel):
    student_id: str
    name: str
    time: str
    confidence: float


class RealtimeResponse(BaseModel):
    type: Literal["frame_result", "pong", "error"]
    frame: Optional[str] = None
    detections: List[Detection] = []
    new_attendance: Optional[RealtimeNewAttendance] = None
    total_attended: int = 0
    attended_list: List[dict] = []
    message: Optional[str] = None
