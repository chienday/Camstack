"""
Attendance session routes.
"""
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.database import get_db
from app.models.session import SessionCreate
from app.services.tracker import attendance_tracker
from app.utils.export import records_to_excel

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(400, "Invalid session id")


def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc["_id"] = str(doc["_id"])
    return doc


@router.post("/start")
async def start_session(payload: SessionCreate):
    db = get_db()
    doc = {
        "session_name": payload.session_name,
        "class": payload.class_name,
        "teacher": payload.teacher,
        "total_students": payload.total_students or 0,
        "attended_count": 0,
        "start_time": datetime.utcnow(),
        "end_time": None,
    }
    res = await db["attendance_sessions"].insert_one(doc)
    doc["_id"] = str(res.inserted_id)

    # init tracker
    attendance_tracker.start_session(doc["_id"])
    return _serialize(doc)


@router.post("/{session_id}/end")
async def end_session(session_id: str):
    db = get_db()
    oid = _oid(session_id)
    state = attendance_tracker.get(session_id)
    attended_count = state.total_attended()

    res = await db["attendance_sessions"].update_one(
        {"_id": oid},
        {"$set": {"end_time": datetime.utcnow(), "attended_count": attended_count}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Session not found")

    attendance_tracker.end_session(session_id)
    doc = await db["attendance_sessions"].find_one({"_id": oid})
    return _serialize(doc)


@router.get("")
async def list_sessions(
    limit: int = 100,
    class_name: Optional[str] = Query(None, alias="class"),
):
    db = get_db()
    q = {}
    if class_name:
        q["class"] = class_name
    cursor = db["attendance_sessions"].find(q).sort("start_time", -1).limit(limit)
    return [_serialize(d) async for d in cursor]


@router.get("/{session_id}")
async def get_session(session_id: str):
    db = get_db()
    doc = await db["attendance_sessions"].find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(404, "Session not found")
    return _serialize(doc)


@router.get("/{session_id}/records")
async def get_records(session_id: str):
    db = get_db()
    cursor = db["attendance_records"].find({"session_id": session_id}).sort("check_in_time", 1)
    return [_serialize(d) async for d in cursor]


@router.get("/{session_id}/export/excel")
async def export_excel(session_id: str):
    db = get_db()
    oid = _oid(session_id)
    session = await db["attendance_sessions"].find_one({"_id": oid})
    if not session:
        raise HTTPException(404, "Session not found")

    records = await db["attendance_records"].find({"session_id": session_id}).sort("check_in_time", 1).to_list(length=None)
    xlsx_bytes = records_to_excel(session, records)

    filename = f"attendance_{session_id}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/stats/overview")
async def stats_overview():
    """Quick stats for dashboard."""
    db = get_db()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_students = await db["students"].count_documents({})
    total_sessions = await db["attendance_sessions"].count_documents({})
    sessions_today = await db["attendance_sessions"].count_documents({"start_time": {"$gte": today_start}})
    records_today = await db["attendance_records"].count_documents({"check_in_time": {"$gte": today_start}})

    # weekly records histogram
    pipeline = [
        {"$match": {"check_in_time": {"$gte": today_start.replace(day=max(1, today_start.day - 6))}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$check_in_time"}},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    weekly = [doc async for doc in db["attendance_records"].aggregate(pipeline)]

    return {
        "total_students": total_students,
        "total_sessions": total_sessions,
        "sessions_today": sessions_today,
        "records_today": records_today,
        "weekly": [{"date": w["_id"], "count": w["count"]} for w in weekly],
    }


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its attendance records."""
    db = get_db()
    oid = _oid(session_id)
    
    # Delete session
    session_result = await db["attendance_sessions"].delete_one({"_id": oid})
    if session_result.deleted_count == 0:
        raise HTTPException(404, "Session not found")
    
    # Delete associated records
    await db["attendance_records"].delete_many({"session_id": session_id})
    
    # Cleanup tracker if session is still active
    if session_id in attendance_tracker._sessions:
        attendance_tracker.end_session(session_id)
    
    return {"message": "Session deleted successfully", "session_id": session_id}
