from app import db
from app.models.video import Video


def process_video(flask_app, video_id):
    with flask_app.app_context():
        flask_app.logger.info("process_video:start video_id=%s", video_id)

        video = db.session.get(Video, video_id)
        if not video:
            flask_app.logger.warning("process_video:not_found video_id=%s", video_id)
            return

        try:
            video.status = "PROCESSADO"
            db.session.commit()
            flask_app.logger.info(
                "process_video:completed video_id=%s filename=%s", video.id, video.filename
            )
        except Exception:
            db.session.rollback()
            flask_app.logger.exception("process_video:failed video_id=%s", video_id)
            raise
