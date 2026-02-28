import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass(frozen=True)
class DetectionSettings:
    teste_root: Path
    repo_root: Path
    backend_root: Path
    uploads_dir: Path
    explicit_video_path: Optional[Path]
    log_file: Path

    @classmethod
    def default(cls) -> "DetectionSettings":
        teste_root = Path(__file__).resolve().parents[2]
        repo_root = teste_root.parent
        backend_root = repo_root / "demoviefy-backend"
        uploads_dir = repo_root / "uploads"

        explicit_video_value = os.getenv("TEST_VIDEO_PATH")
        explicit_video_path = Path(explicit_video_value) if explicit_video_value else None

        return cls(
            teste_root=teste_root,
            repo_root=repo_root,
            backend_root=backend_root,
            uploads_dir=uploads_dir,
            explicit_video_path=explicit_video_path,
            log_file=repo_root / "app.log",
        )
