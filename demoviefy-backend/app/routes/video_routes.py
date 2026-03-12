from flask import Blueprint

from app.controllers.video_controller import (
    delete_video_by_id,
    get_video_analysis,
    get_video_details,
    home,
    list_videos,
    upload_video,
    update_video_status,
)

video_bp = Blueprint("video", __name__)

video_bp.add_url_rule("/videos", view_func=upload_video, methods=["POST"])
video_bp.add_url_rule("/videos", view_func=list_videos, methods=["GET"])
video_bp.add_url_rule("/videos/<int:video_id>", view_func=get_video_details, methods=["GET"])
video_bp.add_url_rule("/videos/<int:video_id>", view_func=update_video_status, methods=["PATCH"])
video_bp.add_url_rule("/videos/<int:video_id>", view_func=delete_video_by_id, methods=["DELETE"])
video_bp.add_url_rule("/videos/<int:video_id>/analysis", view_func=get_video_analysis, methods=["GET"])
video_bp.add_url_rule("/", view_func=home, methods=["GET"])
