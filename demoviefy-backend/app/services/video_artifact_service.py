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


AI_CONFIG_KEYS = {
    "task_type",
    "task_label",
    "model_path",
    "model_relative_path",
    "model_name",
    "frame_stride",
    "confidence_threshold",
    "max_frames",
    "clip_start_sec",
    "clip_end_sec",
}

PROCESSING_STATE_KEYS = {
    "processing_progress",
    "processing_stage",
    "processing_eta_seconds",
    "processing_message",
}


def _resolve_model_payload(payload: dict[str, Any], defaults: dict[str, Any]) -> dict[str, Any]:
    model_reference = payload.get("model_relative_path") or payload.get("model_path")
    model = get_model_by_relative_path(str(model_reference)) if model_reference else None

    if model is not None:
        return {
            "task_type": model["task_type"],
            "task_label": model["task_label"],
            "model_path": model["absolute_path"],
            "model_relative_path": model["relative_path"],
            "model_name": model["name"],
        }

    model_path = payload.get("model_path") or defaults["model_path"]
    model_relative_path = payload.get("model_relative_path") or defaults["model_relative_path"]
    model_name = payload.get("model_name") or Path(str(model_path)).name or defaults["model_name"]

    return {
        "task_type": payload.get("task_type") or defaults["task_type"],
        "task_label": payload.get("task_label") or defaults["task_label"],
        "model_path": str(model_path),
        "model_relative_path": str(model_relative_path),
        "model_name": str(model_name),
    }


def _safe_int(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _safe_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


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
        "frame_stride": settings.frame_stride,
        "confidence_threshold": settings.confidence,
        "max_frames": settings.max_frames,
        "clip_start_sec": 0.0,
        "clip_end_sec": None,
    }


def _default_processing_state() -> dict[str, Any]:
    return {
        "processing_progress": 0,
        "processing_stage": "idle",
        "processing_eta_seconds": None,
        "processing_message": "Aguardando processamento.",
    }


def to_repo_relative_path(path_value: str) -> str:
    return to_repo_relative(Path(path_value))


def normalize_metadata_payload(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    raw_payload = dict(payload or {})
    ai_defaults = _default_ai_config()
    processing_defaults = _default_processing_state()
    model_payload = _resolve_model_payload(raw_payload, ai_defaults)

    normalized = {
        **raw_payload,
        **processing_defaults,
        **ai_defaults,
        **model_payload,
    }
    normalized["frame_stride"] = _safe_int(
        raw_payload.get("frame_stride", ai_defaults["frame_stride"]),
        ai_defaults["frame_stride"],
    )
    normalized["confidence_threshold"] = round(
        _safe_float(
            raw_payload.get("confidence_threshold", ai_defaults["confidence_threshold"]),
            ai_defaults["confidence_threshold"],
        ),
        4,
    )
    normalized["max_frames"] = _safe_int(
        raw_payload.get("max_frames", ai_defaults["max_frames"]),
        ai_defaults["max_frames"],
    )
    normalized["clip_start_sec"] = round(_safe_float(raw_payload.get("clip_start_sec", 0.0) or 0.0, 0.0), 2)

    clip_end_sec = raw_payload.get("clip_end_sec")
    normalized["clip_end_sec"] = (
        round(_safe_float(clip_end_sec, 0.0), 2)
        if clip_end_sec not in (None, "", "null")
        else None
    )
    normalized["processing_progress"] = max(
        0,
        min(
            _safe_int(
                raw_payload.get("processing_progress", processing_defaults["processing_progress"]),
                processing_defaults["processing_progress"],
            ),
            100,
        ),
    )
    normalized["processing_stage"] = str(
        raw_payload.get("processing_stage", processing_defaults["processing_stage"]),
    )
    normalized["processing_eta_seconds"] = (
        _safe_int(raw_payload["processing_eta_seconds"], 0)
        if raw_payload.get("processing_eta_seconds") not in (None, "", "null")
        else None
    )
    normalized["processing_message"] = raw_payload.get(
        "processing_message",
        processing_defaults["processing_message"],
    )
    return normalized


def ensure_metadata_payload(video_id: int) -> dict[str, Any]:
    normalized = normalize_metadata_payload(_read_json(metadata_file_path(video_id)))
    _write_json(metadata_file_path(video_id), normalized)
    return normalized


def load_ai_config(video_id: int) -> dict[str, Any]:
    payload = normalize_metadata_payload(_read_json(metadata_file_path(video_id)))
    return {key: payload[key] for key in AI_CONFIG_KEYS}


def save_ai_config(
    video_id: int,
    *,
    task_type: str,
    model_path: str,
    task_label: str,
    model_name: str,
    frame_stride: int,
    confidence_threshold: float,
    max_frames: int,
    clip_start_sec: float = 0.0,
    clip_end_sec: float | None = None,
) -> dict[str, Any]:
    payload = normalize_metadata_payload(_read_json(metadata_file_path(video_id)))
    payload.update({
        "task_type": task_type,
        "task_label": task_label,
        "model_path": model_path,
        "model_relative_path": to_repo_relative_path(model_path),
        "model_name": model_name,
        "frame_stride": frame_stride,
        "confidence_threshold": confidence_threshold,
        "max_frames": max_frames,
        "clip_start_sec": clip_start_sec,
        "clip_end_sec": clip_end_sec,
    })
    normalized = normalize_metadata_payload(payload)
    _write_json(metadata_file_path(video_id), normalized)
    return {key: normalized[key] for key in AI_CONFIG_KEYS}


def load_processing_state(video_id: int) -> dict[str, Any]:
    payload = normalize_metadata_payload(_read_json(metadata_file_path(video_id)))
    return {key: payload[key] for key in PROCESSING_STATE_KEYS}


def save_processing_state(
    video_id: int,
    *,
    progress: int,
    stage: str,
    eta_seconds: int | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    payload = normalize_metadata_payload(_read_json(metadata_file_path(video_id)))
    payload.update({
        "processing_progress": max(0, min(int(progress), 100)),
        "processing_stage": stage,
        "processing_eta_seconds": eta_seconds,
        "processing_message": message,
    })
    _write_json(metadata_file_path(video_id), normalize_metadata_payload(payload))
    return load_processing_state(video_id)


def load_transcription(video_id: int) -> dict[str, Any] | None:
    return _read_json(transcription_file_path(video_id))


def save_transcription(
    video_id: int,
    *,
    content: str,
    source: str = "manual",
    language: str | None = None,
    segments: list[dict[str, Any]] | None = None,
    model_name: str | None = None,
    status: str = "ready",
    error: str | None = None,
) -> dict[str, Any]:
    payload = {
        "content": content,
        "source": source,
        "language": language,
        "segments": segments or [],
        "model_name": model_name,
        "status": status,
        "error": error,
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
