import os

from app import db
from app.config.ai_settings import load_frame_ai_settings
from app.models.video import Video
from app.repositories.video_repository import get_video, update_status
from app.services.frame_ai_service import analyze_video_frames, save_analysis


def process_video(flask_app, video_id):
    with flask_app.app_context():
        flask_app.logger.info("process_video:start video_id=%s", video_id)

        video = get_video(video_id)
        if not video:
            flask_app.logger.warning("process_video:not_found video_id=%s", video_id)
            return

        video_path = os.path.join("uploads", video.filename)
        if not os.path.exists(video_path):
            update_status(video, "ERRO_ARQUIVO")
            flask_app.logger.error("process_video:file_not_found video_id=%s path=%s", video_id, video_path)
            return

        try:
            update_status(video, "PROCESSANDO_IA")
            settings = load_frame_ai_settings()

            summary = analyze_video_frames(
                video_path=video_path,
                model_path=settings.model_path,
                frame_stride=settings.frame_stride,
                conf_threshold=settings.confidence,
                max_frames=settings.max_frames,
                logger=flask_app.logger,
            )
            analysis_path = save_analysis(video_id, summary)

            update_status(video, "PROCESSADO")
            flask_app.logger.info(
                "process_video:completed video_id=%s filename=%s analysis=%s",
                video.id,
                video.filename,
                analysis_path,
            )
        except Exception:
            db.session.rollback()
            video = get_video(video_id)
            if video:
                update_status(video, "ERRO_IA")
            flask_app.logger.exception("process_video:failed video_id=%s", video_id)
