"""FFmpeg and video-preparation helpers used during frame analysis."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def _normalize_annotated_mp4(
    source_path: Path, 
    output_path: Path, 
    logger: Any | None = None,
    original_video_path: Path | None = None,
    clip_start_sec: float = 0.0,
    clip_end_sec: float | None = None,
    ) -> bool:
    """Normalize an annotated MP4 into a browser-playable artifact."""
    from app.services.frame_ai_service import _normalize_annotated_mp4 as _legacy_impl

    return _legacy_impl(
        source_path, 
        output_path, 
        logger=logger,
        original_video_path=original_video_path,
        clip_start_sec=clip_start_sec,
        clip_end_sec= clip_end_sec)


def normalize_annotated_mp4(source_path: Path, output_path: Path, logger: Any | None = None) -> bool:
    """Public wrapper for annotated MP4 normalization."""
    return _normalize_annotated_mp4(source_path, output_path, logger=logger)


def _probe_video_stream(file_path: Path, logger: Any | None = None) -> dict[str, str] | None:
    """Inspect the container metadata of a source video."""
    from app.services.frame_ai_service import _probe_video_stream as _legacy_impl

    return _legacy_impl(file_path, logger=logger)


def probe_video_stream(file_path: Path, logger: Any | None = None) -> dict[str, str] | None:
    """Public wrapper for stream inspection."""
    return _probe_video_stream(file_path, logger=logger)


def _is_browser_playable_mp4(file_path: Path, logger: Any | None = None) -> bool:
    """Return whether the provided MP4 can be served directly in a browser."""
    from app.services.frame_ai_service import _is_browser_playable_mp4 as _legacy_impl

    return _legacy_impl(file_path, logger=logger)


def is_browser_playable_mp4(file_path: Path, logger: Any | None = None) -> bool:
    """Public browser-playability helper."""
    return _is_browser_playable_mp4(file_path, logger=logger)


def _variant_browser_path(source_path: Path) -> Path:
    """Return the browser-optimized filename for a variant artifact."""
    from app.services.frame_ai_service import _variant_browser_path as _legacy_impl

    return _legacy_impl(source_path)


def variant_browser_path(source_path: Path) -> Path:
    """Public variant-browser path helper."""
    return _variant_browser_path(source_path)


def _resolve_annotated_source_path(video_id: int, variant_id: str | None = None) -> Path:
    """Resolve the canonical annotated-video path for a processing variant."""
    from app.services.frame_ai_service import _resolve_annotated_source_path as _legacy_impl

    return _legacy_impl(video_id, variant_id)


def resolve_annotated_source_path(video_id: int, variant_id: str | None = None) -> Path:
    """Public alias for variant source path resolution."""
    return _resolve_annotated_source_path(video_id, variant_id)
