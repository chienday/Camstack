"""
FastAPI application entry point.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response

from app.config import settings
from app.database import close_mongo_connection, connect_to_mongo
from app.routes import detection, sessions, students, websocket
from app.services.face_detector import face_detector
from app.services.face_quality import face_quality_gate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("camstack")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Camstack backend...")
    try:
        await connect_to_mongo()
        logger.info("✅ MongoDB connected")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")

    try:
        face_detector.load()
        logger.info("✅ YOLO model loaded")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")

    try:
        face_quality_gate.load()
    except Exception as e:
        logger.error(f"❌ Failed to load face quality gate: {e}")

    yield

    # Shutdown
    logger.info("🛑 Shutting down...")
    await close_mongo_connection()


app = FastAPI(
    title="Camstack - Face Recognition Attendance API",
    description="Full-stack face-recognition based classroom attendance service.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Static (for processed video outputs)
app.mount("/uploads", StaticFiles(directory=str(settings.upload_abs_dir)), name="uploads")


# Handle OPTIONS requests for CORS preflight
@app.options("/api/detect/image")
@app.options("/api/detect/video")
async def options_handler():
    return Response(status_code=200)


# Routes
app.include_router(students.router)
app.include_router(detection.router)
app.include_router(sessions.router)
app.include_router(websocket.router)


@app.get("/", tags=["root"])
async def root():
    return {
        "service": "Camstack Attendance API",
        "version": app.version,
        "docs": "/docs",
    }


@app.get("/api/health", tags=["root"])
async def health():
    return {
        "status": "ok",
        "model_loaded": face_detector._model is not None,
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "confirmation_frames": settings.CONFIRMATION_FRAMES,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
