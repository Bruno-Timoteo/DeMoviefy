from flask import Blueprint, current_app, jsonify, request
import os
import threading

from werkzeug.utils import secure_filename

from app import db
from app.models.video import Video
from app.services.video_service import process_video

video_bp = Blueprint("video", __name__)

UPLOAD_FOLDER = "uploads"


@video_bp.route("/videos", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        current_app.logger.warning("upload_video:missing_file")
        return jsonify({"error": "Nenhum arquivo enviado"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename)

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    current_app.logger.info("upload_video:saved filename=%s path=%s", filename, filepath)

    new_video = Video(filename=filename)
    db.session.add(new_video)
    db.session.commit()
    current_app.logger.info("upload_video:db_saved video_id=%s", new_video.id)

    flask_app = current_app._get_current_object()
    thread = threading.Thread(target=process_video, args=(flask_app, new_video.id), daemon=True)
    thread.start()
    current_app.logger.info("upload_video:processing_thread_started video_id=%s", new_video.id)

    return jsonify({
        "message": "Upload realizado com sucesso",
        "video": new_video.to_dict(),
    })


@video_bp.route("/videos", methods=["GET"])
def list_videos():
    videos = Video.query.order_by(Video.created_at.desc()).all()
    current_app.logger.debug("list_videos:count=%s", len(videos))
    return jsonify([video.to_dict() for video in videos])


@video_bp.route("/")
def home():
    return """
    <h1>DeMoviefy Backend</h1>
    <p>Servidor rodando com sucesso.</p>
    """
