from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.models.video import Video
from app.services.metadata_migration_service import migrate_metadata_files


def main() -> int:
    app = create_app()
    with app.app_context():
        video_ids = [video.id for video in Video.query.all()]
        summary = migrate_metadata_files(video_ids=video_ids, logger=app.logger)
        print(
            "metadata_migration",
            f"candidates={summary['candidates']}",
            f"migrated={summary['migrated']}",
            f"created={summary['created']}",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
