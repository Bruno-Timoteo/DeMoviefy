"""
Helpers for video transcription artifacts.

At the moment the project supports manual editing and storage of
transcriptions through the API/UI. This keeps the workflow usable even when
the optional Whisper stack is not installed in the environment.
"""

from app.services.video_artifact_service import (
    delete_transcription,
    has_transcription,
    load_transcription,
    save_transcription,
)

__all__ = [
    "delete_transcription",
    "has_transcription",
    "load_transcription",
    "save_transcription",
]
