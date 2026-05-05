"""
Application configuration using pydantic-settings.
Values are loaded from environment variables or a .env file.
"""
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent  # backend/


class Settings(BaseSettings):
    # --- MongoDB ---
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "camstack"

    # --- Model ---
    MODEL_PATH: str = "models/best.pt"
    STUDENT_MAP_PATH: str = "models/student_id_map.json"
    CONFIDENCE_THRESHOLD: float = 0.7
    CONFIRMATION_FRAMES: int = 3

    # --- Realtime quality gate (dlib) ---
    LANDMARK_MODEL_PATH: str = "models/shape_predictor_68_face_landmarks.dat"
    REALTIME_QUALITY_ENABLE: bool = True
    REALTIME_ALIGNMENT_ENABLE: bool = True
    REALTIME_MIN_BRIGHTNESS: float = 60.0
    REALTIME_MAX_BRIGHTNESS: float = 200.0
    REALTIME_MIN_SHARPNESS: float = 80.0
    REALTIME_MAX_ROLL_DEG: float = 20.0
    REALTIME_MIN_FACE_SIZE: int = 80

    # --- Realtime tracking/voting ---
    REALTIME_TRACKING_ENABLE: bool = True
    REALTIME_TRACK_IOU: float = 0.3
    REALTIME_TRACK_MAX_AGE: int = 10
    REALTIME_TRACK_MIN_HITS: int = 3

    # --- Upload video tracking/voting ---
    VIDEO_TRACKING_ENABLE: bool = True
    VIDEO_TRACK_IOU: float = 0.3
    VIDEO_TRACK_MAX_AGE: int = 10
    VIDEO_TRACK_MIN_HITS: int = 3

    # --- Server ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000,*"

    # --- Upload ---
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 100

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def model_abs_path(self) -> Path:
        p = Path(self.MODEL_PATH)
        return p if p.is_absolute() else (BASE_DIR / p)

    @property
    def student_map_abs_path(self) -> Path:
        p = Path(self.STUDENT_MAP_PATH)
        return p if p.is_absolute() else (BASE_DIR / p)

    @property
    def landmark_model_abs_path(self) -> Path:
        p = Path(self.LANDMARK_MODEL_PATH)
        return p if p.is_absolute() else (BASE_DIR / p)

    @property
    def upload_abs_dir(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        return p if p.is_absolute() else (BASE_DIR / p)


settings = Settings()

# Ensure upload directory exists
settings.upload_abs_dir.mkdir(parents=True, exist_ok=True)
