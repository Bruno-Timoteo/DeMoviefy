"""
Helpers for video transcription artifacts.

This module keeps persistence helpers re-exported, but also provides a
Whisper-based transcription path with timestamped segments when the optional
dependency is installed.
"""

import json
import os
import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config.paths import TRANSCRIPTION_ENV_DIR, TRANSCRIPTION_SCRIPT_PATH
from app.services.video_artifact_service import (
    delete_transcription,
    has_transcription,
    load_transcription,
    save_transcription,
)


def _local_whisper_available() -> bool:
    try:
        import whisper  # noqa: F401
    except Exception:
        return False
    return True


def _transcription_python_candidates() -> list[Path]:
    candidates: list[Path] = []
    override = os.environ.get("DEMOVIEFY_TRANSCRIPTION_PYTHON")
    if override:
        candidates.append(Path(override))

    if os.name == "nt":
        candidates.append(TRANSCRIPTION_ENV_DIR / "Scripts" / "python.exe")
    else:
        candidates.extend(
            [
                TRANSCRIPTION_ENV_DIR / "bin" / "python",
                TRANSCRIPTION_ENV_DIR / "bin" / "python3",
            ]
        )
    return candidates


def resolve_transcription_python() -> Path | None:
    for candidate in _transcription_python_candidates():
        if candidate.exists():
            return candidate
    return None


def whisper_available() -> bool:
    return resolve_transcription_python() is not None or _local_whisper_available()


@lru_cache(maxsize=4)
def _load_whisper_model(model_name: str):
    import whisper

    return whisper.load_model(model_name)


def _transcribe_with_local_whisper(
    *,
    video_path: str,
    model_name: str,
    language: str | None,
    logger: Any | None,
) -> dict[str, Any]:
    if logger:
        logger.info(
            "transcription:start mode=local video_path=%s model=%s language=%s",
            video_path,
            model_name,
            language or "auto",
        )

    model = _load_whisper_model(model_name)
    result = model.transcribe(video_path, verbose=False, language=language)
    segments = [
        {
            "id": int(segment.get("id", index)),
            "start": round(float(segment.get("start", 0.0)), 2),
            "end": round(float(segment.get("end", 0.0)), 2),
            "text": str(segment.get("text", "")).strip(),
        }
        for index, segment in enumerate(result.get("segments", []))
        if str(segment.get("text", "")).strip()
    ]
    payload = {
        "content": " ".join(segment["text"] for segment in segments).strip(),
        "source": "whisper",
        "language": result.get("language") or language,
        "segments": segments,
        "model_name": model_name,
        "status": "ready",
        "error": None,
    }

    if logger:
        logger.info(
            "transcription:done mode=local segments=%s language=%s",
            len(segments),
            payload["language"],
        )

    return payload


def _transcribe_with_worker(
    *,
    python_executable: Path,
    video_path: str,
    model_name: str,
    language: str | None,
    logger: Any | None,
) -> dict[str, Any]:
    command = [
        str(python_executable),
        str(TRANSCRIPTION_SCRIPT_PATH),
        "--video",
        video_path,
        "--model",
        model_name,
    ]
    if language:
        command.extend(["--language", language])

    if logger:
        logger.info(
            "transcription:start mode=worker python=%s model=%s language=%s",
            python_executable,
            model_name,
            language or "auto",
        )

    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode != 0:
        details = completed.stderr.strip() or completed.stdout.strip() or "worker sem detalhes"
        raise RuntimeError(f"Falha no worker de transcricao: {details}")

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("O worker de transcricao retornou JSON invalido.") from exc

    if logger:
        logger.info(
            "transcription:done mode=worker segments=%s language=%s",
            len(payload.get("segments", [])),
            payload.get("language"),
        )

    return payload


def transcribe_video_with_timestamps(
    *,
    video_path: str,
    model_name: str = "base",
    language: str | None = None,
    logger: Any | None = None,
) -> dict[str, Any]:
    worker_python = resolve_transcription_python()
    worker_error: Exception | None = None

    # Prefer a dedicated env so the main backend can stay on newer Python
    # versions while Whisper remains isolated on 3.11/3.12.
    if worker_python is not None and TRANSCRIPTION_SCRIPT_PATH.exists():
        try:
            return _transcribe_with_worker(
                python_executable=worker_python,
                video_path=video_path,
                model_name=model_name,
                language=language,
                logger=logger,
            )
        except Exception as exc:
            worker_error = exc
            if logger:
                logger.warning("transcription:worker_failed reason=%s", exc)

    if _local_whisper_available():
        return _transcribe_with_local_whisper(
            video_path=video_path,
            model_name=model_name,
            language=language,
            logger=logger,
        )

    if worker_error is not None:
        raise RuntimeError(
            f"Transcricao automatica indisponivel no worker dedicado: {worker_error}"
        ) from worker_error

    raise RuntimeError(
        "Transcricao automatica indisponivel: crie a .venv-transcription com Python 3.11/3.12 "
        "ou instale openai-whisper no ambiente atual."
    )


__all__ = [
    "delete_transcription",
    "has_transcription",
    "load_transcription",
    "resolve_transcription_python",
    "save_transcription",
    "transcribe_video_with_timestamps",
    "whisper_available",
]
