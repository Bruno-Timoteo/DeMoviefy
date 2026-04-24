from app import db
from app.config.paths import annotated_video_path, annotated_video_temp_path, video_file_path
from app.repositories.video_repository import get_video, update_status
from app.services.frame_ai_service import analyze_video_frames, save_analysis
from app.services.transcription_service import save_transcription, transcribe_video_with_timestamps
from app.services.video_artifact_service import delete_analysis, load_ai_config, save_processing_state


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
            save_processing_state(
                video_id,
                progress=5,
                stage="preparing",
                eta_seconds=None,
                message="Preparando video e configuracoes da analise.",
            )
            # The per-video config lets the user reprocess the same upload with
            # a different model or task without duplicating the file itself.
            ai_config = load_ai_config(video_id)
            annotated_path = annotated_video_path(video_id)
            annotated_temp_path = annotated_video_temp_path(video_id)

            # Remove the previous analysis/preview so the UI clearly reflects
            # that a fresh processing cycle is underway.
            delete_analysis(video_id)
            if annotated_path.exists():
                annotated_path.unlink()
            if annotated_temp_path.exists():
                annotated_temp_path.unlink()
            last_reported_progress = {"value": 5}

            def report_analysis_progress(progress_payload: dict) -> None:
                ratio = float(progress_payload.get("ratio", 0.0))
                sampled_frames = int(progress_payload.get("sampled_frames", 0))
                estimated_total = int(progress_payload.get("estimated_total_samples", 1))
                elapsed_seconds = float(progress_payload.get("elapsed_seconds", 0.0))
                progress_value = 10 + int(ratio * 80)
                if progress_value <= last_reported_progress["value"]:
                    return

                last_reported_progress["value"] = progress_value
                eta_seconds = None
                if ratio > 0:
                    eta_seconds = max(0, int((elapsed_seconds / ratio) - elapsed_seconds))

                save_processing_state(
                    video_id,
                    progress=progress_value,
                    stage="analyzing",
                    eta_seconds=eta_seconds,
                    message=f"Analisando frames {sampled_frames}/{estimated_total}.",
                )

            summary = analyze_video_frames(
                video_path=str(video_path),
                model_path=ai_config["model_path"],
                task_type=ai_config["task_type"],
                frame_stride=int(ai_config.get("frame_stride") or flask_app.config.get("FRAME_AI_FRAME_STRIDE", 8)),
                conf_threshold=float(
                    ai_config.get("confidence_threshold") or flask_app.config.get("FRAME_AI_CONFIDENCE", 0.35)
                ),
                max_frames=int(ai_config.get("max_frames") or flask_app.config.get("FRAME_AI_MAX_FRAMES", 300)),
                clip_start_sec=float(ai_config.get("clip_start_sec") or 0.0),
                clip_end_sec=ai_config.get("clip_end_sec"),
                annotated_output_path=str(annotated_path),
                progress_callback=report_analysis_progress,
                logger=flask_app.logger,
            )
            summary["selected_model"] = ai_config
            analysis_path = save_analysis(video_id, summary)
            save_processing_state(
                video_id,
                progress=100,
                stage="completed",
                eta_seconds=0,
                message="Processamento concluido. Clique em 'Gerar transcricao IA' para transcricao sob demanda.",
            )

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
            save_processing_state(
                video_id,
                progress=100,
                stage="error",
                eta_seconds=None,
                message="Falha durante o processamento.",
            )
            annotated_temp_path = annotated_video_temp_path(video_id)
            if annotated_temp_path.exists():
                annotated_temp_path.unlink()
            flask_app.logger.exception("process_video:failed video_id=%s", video_id)
