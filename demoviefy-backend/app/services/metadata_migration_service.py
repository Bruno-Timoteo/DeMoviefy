import re
from pathlib import Path
from typing import Any

from app.config.paths import BACKEND_ROOT, METADATA_DIR, ensure_storage_dirs, metadata_file_path
from app.services.video_artifact_service import normalize_metadata_payload


LEGACY_METADATA_DIR = BACKEND_ROOT / "uploads" / "metadata"
VIDEO_METADATA_PATTERN = re.compile(r"video_(\d+)\.json$", re.IGNORECASE)


def _extract_video_id(path: Path) -> int | None:
    match = VIDEO_METADATA_PATTERN.match(path.name)
    if match is None:
        return None
    return int(match.group(1))


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    import json

    with open(path, "r", encoding="utf-8") as file:
        payload = json.load(file)
    return payload if isinstance(payload, dict) else {}


def migrate_metadata_files(video_ids: list[int] | None = None, logger: Any | None = None) -> dict[str, int]:
    ensure_storage_dirs()
    candidate_ids = set(video_ids or [])

    for directory in (METADATA_DIR, LEGACY_METADATA_DIR):
        if not directory.exists():
            continue
        for path in directory.glob("video_*.json"):
            video_id = _extract_video_id(path)
            if video_id is not None:
                candidate_ids.add(video_id)

    migrated = 0
    created = 0
    for video_id in sorted(candidate_ids):
        target_path = metadata_file_path(video_id)
        source_path = target_path if target_path.exists() else LEGACY_METADATA_DIR / target_path.name
        original_payload = _read_json(source_path) or {}
        normalized_payload = normalize_metadata_payload(original_payload)

        if not target_path.exists():
            created += 1
        if original_payload != normalized_payload or source_path != target_path or not target_path.exists():
            import json

            with open(target_path, "w", encoding="utf-8") as file:
                json.dump(normalized_payload, file, ensure_ascii=True, indent=2)
            migrated += 1

    if logger is not None:
        logger.info(
            "metadata_migration:completed candidates=%s migrated=%s created=%s",
            len(candidate_ids),
            migrated,
            created,
        )

    return {
        "candidates": len(candidate_ids),
        "migrated": migrated,
        "created": created,
    }
