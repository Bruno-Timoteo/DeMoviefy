from app import db
from app.config.paths import video_file_path
from app.repositories.video_repository import get_video, update_status
from app.services.frame_ai_service import analyze_video_frames, save_analysis
from app.services.video_artifact_service import load_ai_config


def process_video(flask_app, video_id):
    with flask_app.app_context():
        flask_app.logger.info("process_video:start video_id=%s", video_id)

        video = get_video(video_id)
        if not video:
            flask_app.logger.warning("process_video:not_found video_id=%s", video_id)
            return

        video_path = video_file_path(video.filename)
        if not video_path.exists():
            update_status(video, "ERRO_ARQUIVO")
            flask_app.logger.error("process_video:file_not_found video_id=%s path=%s", video_id, video_path)
            return

        try:
            update_status(video, "PROCESSANDO_IA")
            # The per-video config lets the user reprocess the same upload with
            # a different model or task without duplicating the file itself.
            ai_config = load_ai_config(video_id)

            summary = analyze_video_frames(
                video_path=str(video_path),
                model_path=ai_config["model_path"],
                task_type=ai_config["task_type"],
                frame_stride=int(flask_app.config.get("FRAME_AI_FRAME_STRIDE", 8)),
                conf_threshold=float(flask_app.config.get("FRAME_AI_CONFIDENCE", 0.35)),
                max_frames=int(flask_app.config.get("FRAME_AI_MAX_FRAMES", 300)),
                logger=flask_app.logger,
            )
            summary["selected_model"] = ai_config
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
