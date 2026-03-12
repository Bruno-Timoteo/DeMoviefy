import time
from pathlib import Path
from typing import Any, Dict, Tuple

from core.backend_bridge import ensure_backend_on_path


class DetectionModel:
    def __init__(self, backend_root: Path):
        self.backend_root = backend_root

    def detect_video(self, *, video_path: Path) -> Tuple[Dict[str, Any], float]:
        ensure_backend_on_path()

        from app.config.ai_settings import load_frame_ai_settings
        from app.services.frame_ai_service import analyze_video_frames

        settings = load_frame_ai_settings()

        start_time = time.perf_counter()
        summary = analyze_video_frames(
            video_path=str(video_path),
            model_path=settings.model_path,
            frame_stride=settings.frame_stride,
            conf_threshold=settings.confidence,
            max_frames=settings.max_frames,
            logger=None,
        )
        elapsed = time.perf_counter() - start_time

        return summary, elapsed
