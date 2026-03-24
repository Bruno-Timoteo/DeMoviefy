from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent
UPLOADS_DIR = REPO_ROOT / "uploads"
ANALYSIS_DIR = UPLOADS_DIR / "analysis"
ANNOTATED_DIR = UPLOADS_DIR / "annotated"
TRANSCRIPTIONS_DIR = UPLOADS_DIR / "transcriptions"
METADATA_DIR = UPLOADS_DIR / "metadata"
MODEL_DIR = REPO_ROOT / "ai_model" / "model"
TRANSCRIPTION_ENV_DIR = REPO_ROOT / ".venv-transcription"
SCRIPTS_DIR = BACKEND_ROOT / "scripts"
TRANSCRIPTION_SCRIPT_PATH = SCRIPTS_DIR / "transcribe_with_whisper.py"


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


def annotated_video_path(video_id: int) -> Path:
    return ANNOTATED_DIR / f"video_{video_id}.mp4"


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
