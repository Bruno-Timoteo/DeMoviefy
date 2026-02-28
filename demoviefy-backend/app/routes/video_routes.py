from flask import Blueprint

from app.controllers.video_controller import (
    get_video_analysis,
    home,
    list_videos,
    upload_video,
)

video_bp = Blueprint("video", __name__)

video_bp.add_url_rule("/videos", view_func=upload_video, methods=["POST"])
video_bp.add_url_rule("/videos", view_func=list_videos, methods=["GET"])
video_bp.add_url_rule("/videos/<int:video_id>/analysis", view_func=get_video_analysis, methods=["GET"])
video_bp.add_url_rule("/", view_func=home, methods=["GET"])
