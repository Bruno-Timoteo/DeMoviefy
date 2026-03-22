from flask import Blueprint

from app.controllers.video_controller import (
    delete_video_by_id,
    delete_video_analysis_by_id,
    delete_video_transcription_by_id,
    get_video_analysis,
    get_video_details,
    get_video_file,
    get_video_transcription,
    home,
    list_ai_models,
    list_videos,
    reprocess_video_by_id,
    upload_video,
    update_video_ai_config,
    update_video_analysis_by_id,
    update_video_status,
    update_video_transcription_by_id,
)

video_bp = Blueprint("video", __name__)

video_bp.add_url_rule("/videos", view_func=upload_video, methods=["POST"])
video_bp.add_url_rule("/videos", view_func=list_videos, methods=["GET"])
video_bp.add_url_rule("/ai/models", view_func=list_ai_models, methods=["GET"])
video_bp.add_url_rule("/videos/<int:video_id>", view_func=get_video_details, methods=["GET"])
video_bp.add_url_rule("/videos/<int:video_id>/file", view_func=get_video_file, methods=["GET"])
video_bp.add_url_rule("/videos/<int:video_id>", view_func=update_video_status, methods=["PATCH"])
video_bp.add_url_rule("/videos/<int:video_id>", view_func=delete_video_by_id, methods=["DELETE"])
video_bp.add_url_rule("/videos/<int:video_id>/analysis", view_func=get_video_analysis, methods=["GET"])
video_bp.add_url_rule("/videos/<int:video_id>/analysis", view_func=update_video_analysis_by_id, methods=["PUT"])
video_bp.add_url_rule("/videos/<int:video_id>/analysis", view_func=delete_video_analysis_by_id, methods=["DELETE"])
video_bp.add_url_rule("/videos/<int:video_id>/transcription", view_func=get_video_transcription, methods=["GET"])
video_bp.add_url_rule("/videos/<int:video_id>/transcription", view_func=update_video_transcription_by_id, methods=["PUT"])
video_bp.add_url_rule("/videos/<int:video_id>/transcription", view_func=delete_video_transcription_by_id, methods=["DELETE"])
video_bp.add_url_rule("/videos/<int:video_id>/ai-config", view_func=update_video_ai_config, methods=["PUT"])
video_bp.add_url_rule("/videos/<int:video_id>/reprocess", view_func=reprocess_video_by_id, methods=["POST"])
video_bp.add_url_rule("/", view_func=home, methods=["GET"])
