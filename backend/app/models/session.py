"""
Pydantic schemas for Attendance Sessions.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    session_name: str = Field(..., examples=["Buổi học 15/01/2025"])
    class_name: Optional[str] = Field(None, alias="class", examples=["CNTT-K15"])
    teacher: Optional[str] = None
    total_students: Optional[int] = 0

    model_config = {"populate_by_name": True}


class SessionOut(BaseModel):
    id: str = Field(..., alias="_id")
    session_name: str
    class_name: Optional[str] = Field(None, alias="class")
    start_time: datetime
    end_time: Optional[datetime] = None
    teacher: Optional[str] = None
    total_students: int = 0
    attended_count: int = 0

    model_config = {"populate_by_name": True}
