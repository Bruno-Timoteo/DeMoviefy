import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class FrameAISettings:
    model_path: str
    frame_stride: int
    confidence: float
    max_frames: int


def _default_model_path() -> str:
    env_model = os.getenv("FRAME_AI_MODEL")
    if env_model:
        return env_model

    backend_root = Path(__file__).resolve().parents[2]
    repo_root = backend_root.parent
    custom_model = repo_root / "teste" / "model" / "yolo26l.pt"
    if custom_model.exists():
        return str(custom_model)

    return "yolov8n.pt"


def load_frame_ai_settings() -> FrameAISettings:
    return FrameAISettings(
        model_path=_default_model_path(),
        frame_stride=int(os.getenv("FRAME_AI_FRAME_STRIDE", "8")),
        confidence=float(os.getenv("FRAME_AI_CONFIDENCE", "0.35")),
        max_frames=int(os.getenv("FRAME_AI_MAX_FRAMES", "300")),
    )
