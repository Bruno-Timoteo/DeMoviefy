from typing import Iterable

from app import db
from app.models.video import Video


def create_video(*, filename: str) -> Video:
    video = Video(filename=filename)
    db.session.add(video)
    db.session.commit()
    return video


def list_videos() -> list[Video]:
    return Video.query.order_by(Video.created_at.desc()).all()


def get_video(video_id: int) -> Video | None:
    return db.session.get(Video, video_id)


def update_status(video: Video, status: str) -> Video:
    video.status = status
    db.session.commit()
    return video


def delete_video(video: Video) -> None:
    db.session.delete(video)
    db.session.commit()
