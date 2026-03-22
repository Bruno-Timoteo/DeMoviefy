import json
from pathlib import Path
from typing import Any

from app.config.ai_settings import load_frame_ai_settings
from app.config.paths import (
    analysis_file_path,
    ensure_storage_dirs,
    metadata_file_path,
    to_repo_relative,
    transcription_file_path,
)
from app.services.ai_catalog_service import get_model_by_relative_path


"""
File-based storage for per-video artifacts.

We keep AI config, analysis JSON and transcription JSON beside the uploads so
the flow stays transparent to the user and does not depend on DB migrations.
"""


def _write_json(path, payload: dict[str, Any]) -> str:
    ensure_storage_dirs()
    with open(path, "w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=True, indent=2)
    return str(path)


def _read_json(path):
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def _default_ai_config() -> dict[str, Any]:
    settings = load_frame_ai_settings()
    model = get_model_by_relative_path(to_repo_relative_path(settings.model_path))
    model_name = model["name"] if model else Path(settings.model_path).name
    return {
        "task_type": settings.task_type,
        "model_path": model["absolute_path"] if model else settings.model_path,
        "model_relative_path": model["relative_path"] if model else settings.model_path,
        "model_name": model_name,
        "task_label": model["task_label"] if model else settings.task_type,
    }


def to_repo_relative_path(path_value: str) -> str:
    return to_repo_relative(Path(path_value))


def load_ai_config(video_id: int) -> dict[str, Any]:
    payload = _read_json(metadata_file_path(video_id))
    if payload is None:
        return _default_ai_config()
    return payload


def save_ai_config(
    video_id: int,
    *,
    task_type: str,
    model_path: str,
    task_label: str,
    model_name: str,
) -> dict[str, Any]:
    payload = {
        "task_type": task_type,
        "task_label": task_label,
        "model_path": model_path,
        "model_relative_path": to_repo_relative_path(model_path),
        "model_name": model_name,
    }
    _write_json(metadata_file_path(video_id), payload)
    return payload


def load_transcription(video_id: int) -> dict[str, Any] | None:
    return _read_json(transcription_file_path(video_id))


def save_transcription(
    video_id: int,
    *,
    content: str,
    source: str = "manual",
    language: str | None = None,
) -> dict[str, Any]:
    payload = {
        "content": content,
        "source": source,
        "language": language,
    }
    _write_json(transcription_file_path(video_id), payload)
    return payload


def delete_transcription(video_id: int) -> None:
    path = transcription_file_path(video_id)
    if path.exists():
        path.unlink()


def has_transcription(video_id: int) -> bool:
    return transcription_file_path(video_id).exists()


def update_analysis(video_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _write_json(analysis_file_path(video_id), payload)
    return payload


def delete_analysis(video_id: int) -> None:
    path = analysis_file_path(video_id)
    if path.exists():
        path.unlink()


def delete_metadata(video_id: int) -> None:
    path = metadata_file_path(video_id)
    if path.exists():
        path.unlink()
