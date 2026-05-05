"""
MongoDB async connection using Motor.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings


class MongoDB:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


mongodb = MongoDB()


async def connect_to_mongo() -> None:
    """Initialize MongoDB connection."""
    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URI)
    mongodb.db = mongodb.client[settings.MONGODB_DB]

    # Ensure indexes
    await mongodb.db["students"].create_index("student_id", unique=True)
    await mongodb.db["attendance_records"].create_index(
        [("session_id", 1), ("student_id", 1)], unique=True
    )
    await mongodb.db["attendance_sessions"].create_index("start_time")


async def close_mongo_connection() -> None:
    """Close MongoDB connection."""
    if mongodb.client:
        mongodb.client.close()


def get_db() -> AsyncIOMotorDatabase:
    """Dependency to get DB handle."""
    if mongodb.db is None:
        raise RuntimeError("MongoDB is not connected yet")
    return mongodb.db
