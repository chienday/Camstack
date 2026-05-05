"""
Pydantic schemas for Student.
"""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, EmailStr


class StudentBase(BaseModel):
    student_id: str = Field(..., examples=["SV001"])
    full_name: str = Field(..., examples=["Nguyễn Văn A"])
    class_name: Optional[str] = Field(None, alias="class", examples=["CNTT-K15"])
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None

    model_config = {"populate_by_name": True}


class StudentCreate(StudentBase):
    face_embedding: Optional[List[float]] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None

    model_config = {"populate_by_name": True}


class StudentOut(StudentBase):
    id: str = Field(..., alias="_id")
    created_at: datetime

    model_config = {"populate_by_name": True}
