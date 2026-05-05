"""
Student CRUD routes.
"""
from datetime import datetime
from typing import List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import get_db
from app.models.student import StudentCreate, StudentUpdate

router = APIRouter(prefix="/api/students", tags=["students"])


def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc["_id"] = str(doc["_id"])
    # normalize field name `class` => same
    return doc


@router.get("", response_model=List[dict])
async def list_students(class_name: str | None = None, limit: int = 500):
    db = get_db()
    query = {}
    if class_name:
        query["class"] = class_name
    cursor = db["students"].find(query).sort("student_id", 1).limit(limit)
    return [_serialize(d) async for d in cursor]


@router.get("/{student_id}")
async def get_student(student_id: str):
    db = get_db()
    doc = await db["students"].find_one({"student_id": student_id})
    if not doc:
        raise HTTPException(404, "Student not found")
    return _serialize(doc)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_student(payload: StudentCreate):
    db = get_db()
    doc = payload.model_dump(by_alias=True, exclude_none=True)
    doc["created_at"] = datetime.utcnow()
    try:
        res = await db["students"].insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(409, f"student_id '{payload.student_id}' already exists")
    doc["_id"] = str(res.inserted_id)
    return _serialize(doc)


@router.put("/{student_id}")
async def update_student(student_id: str, payload: StudentUpdate):
    db = get_db()
    update = payload.model_dump(by_alias=True, exclude_none=True)
    if not update:
        raise HTTPException(400, "No fields to update")
    res = await db["students"].update_one({"student_id": student_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Student not found")
    doc = await db["students"].find_one({"student_id": student_id})
    return _serialize(doc)


@router.delete("/{student_id}")
async def delete_student(student_id: str):
    db = get_db()
    res = await db["students"].delete_one({"student_id": student_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Student not found")
    return {"deleted": True, "student_id": student_id}
