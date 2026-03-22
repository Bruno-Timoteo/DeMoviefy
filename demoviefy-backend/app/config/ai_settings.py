import os
from dataclasses import dataclass

from app.config.paths import MODEL_DIR


@dataclass(frozen=True)
class FrameAISettings:
    model_path: str
    task_type: str
    frame_stride: int
    confidence: float
    max_frames: int


def _default_task_type() -> str:
    return os.getenv("FRAME_AI_TASK", "object_detection")


def _default_model_path() -> str:
    env_model = os.getenv("FRAME_AI_MODEL")
    if env_model:
        return env_model

    default_candidates = [
        MODEL_DIR / "Object_Detection" / "yolo26l.pt",
        MODEL_DIR / "Object_Detection" / "yolo26m.pt",
        MODEL_DIR / "Object_Detection" / "yolo26n.pt",
    ]
    for candidate in default_candidates:
        if candidate.exists():
            return str(candidate)

    return "yolov8n.pt"


def load_frame_ai_settings() -> FrameAISettings:
    return FrameAISettings(
        model_path=_default_model_path(),
        task_type=_default_task_type(),
        frame_stride=int(os.getenv("FRAME_AI_FRAME_STRIDE", "8")),
        confidence=float(os.getenv("FRAME_AI_CONFIDENCE", "0.35")),
        max_frames=int(os.getenv("FRAME_AI_MAX_FRAMES", "300")),
    )
