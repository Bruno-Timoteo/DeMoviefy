import os
import shutil
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent
UPLOADS_DIR = REPO_ROOT / "uploads"
ANALYSIS_DIR = UPLOADS_DIR / "analysis"
ANNOTATED_DIR = UPLOADS_DIR / "annotated"
TRANSCRIPTIONS_DIR = UPLOADS_DIR / "transcriptions"
METADATA_DIR = UPLOADS_DIR / "metadata"
# Some model packages are extracted as ``ai_model/model`` while others keep
# their archive root and become ``ai_model/ai_model/model``. Accept both so the
# catalog can expose every installed mode and model size (including *x.pt).
# Set DEMOVIEFY_MODEL_DIR when models live in a custom external location.
_configured_model_dir = os.getenv("DEMOVIEFY_MODEL_DIR")
_model_dir_candidates = [
    Path(_configured_model_dir) if _configured_model_dir else None,
    REPO_ROOT / "ai_model" / "model",
    REPO_ROOT / "ai_model" / "ai_model" / "model",
]
MODEL_DIR = next((path for path in _model_dir_candidates if path is not None and path.exists()), _model_dir_candidates[1])
TRANSCRIPTION_ENV_DIR = REPO_ROOT / ".venv-transcription"
SCRIPTS_DIR = BACKEND_ROOT / "scripts"
TRANSCRIPTION_SCRIPT_PATH = SCRIPTS_DIR / "transcribe_with_whisper.py"
LOCAL_FFMPEG_BIN_DIR = REPO_ROOT / ".ffmpeg" / "bin"


def ensure_storage_dirs() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)
    TRANSCRIPTIONS_DIR.mkdir(parents=True, exist_ok=True)
    METADATA_DIR.mkdir(parents=True, exist_ok=True)


def video_file_path(filename: str) -> Path:
    return UPLOADS_DIR / filename


def analysis_file_path(video_id: int) -> Path:
    return ANALYSIS_DIR / f"video_{video_id}.json"


def analysis_variant_file_path(video_id: int, variant_id: str) -> Path:
    return ANALYSIS_DIR / f"video_{video_id}__{variant_id}.json"


def annotated_video_path(video_id: int) -> Path:
    return ANNOTATED_DIR / f"video_{video_id}.mp4"


def annotated_video_variant_path(video_id: int, variant_id: str) -> Path:
    return ANNOTATED_DIR / f"video_{video_id}__{variant_id}.mp4"


def annotated_video_temp_path(video_id: int) -> Path:
    return ANNOTATED_DIR / f"video_{video_id}.processing.mp4"


def transcription_file_path(video_id: int) -> Path:
    return TRANSCRIPTIONS_DIR / f"video_{video_id}.json"


def metadata_file_path(video_id: int) -> Path:
    return METADATA_DIR / f"video_{video_id}.json"


def to_repo_relative(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _tool_path_from_candidates(*names: str) -> Path | None:
    for name in names:
        local_path = LOCAL_FFMPEG_BIN_DIR / name
        if local_path.exists():
            return local_path

    for name in names:
        resolved = shutil.which(name)
        if resolved:
            return Path(resolved)

    return None


def ffmpeg_path() -> Path | None:
    return _tool_path_from_candidates("ffmpeg", "ffmpeg.exe")


def ffprobe_path() -> Path | None:
    return _tool_path_from_candidates("ffprobe", "ffprobe.exe")
