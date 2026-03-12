import os
import threading

from flask import current_app, jsonify, request
from werkzeug.utils import secure_filename

from app.repositories.video_repository import (
    create_video,
    delete_video,
    get_video,
    list_videos as list_videos_repo,
    update_status,
)
from app.services.frame_ai_service import has_analysis, load_analysis
from app.services.video_service import process_video


UPLOAD_FOLDER = "uploads"
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def _is_allowed_video(filename: str) -> bool:
    extension = os.path.splitext(filename)[1].lower()
    return extension in ALLOWED_VIDEO_EXTENSIONS


def upload_video():
    if "file" not in request.files:
        current_app.logger.warning("upload_video:missing_file")
        return jsonify({"error": "Nenhum arquivo enviado"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename or "")

    if not filename:
        current_app.logger.warning("upload_video:empty_filename")
        return jsonify({"error": "Nome de arquivo invalido"}), 400

    if not _is_allowed_video(filename):
        current_app.logger.warning("upload_video:invalid_extension filename=%s", filename)
        return (
            jsonify({"error": "Formato de video nao suportado. Use mp4/mov/avi/mkv/webm"}),
            400,
        )

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    current_app.logger.info("upload_video:saved filename=%s path=%s", filename, filepath)

    new_video = create_video(filename=filename)
    current_app.logger.info("upload_video:db_saved video_id=%s", new_video.id)

    flask_app = current_app._get_current_object()
    thread = threading.Thread(target=process_video, args=(flask_app, new_video.id), daemon=True)
    thread.start()
    current_app.logger.info("upload_video:processing_thread_started video_id=%s", new_video.id)

    return jsonify({"message": "Upload realizado com sucesso", "video": new_video.to_dict()})


def list_videos():
    videos = list_videos_repo()
    payload = []
    for video in videos:
        item = video.to_dict()
        item["analysis_ready"] = has_analysis(video.id)
        payload.append(item)
    return jsonify(payload)


def get_video_analysis(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    analysis = load_analysis(video_id)
    if analysis is None:
        if video.status in {"PROCESSANDO", "PROCESSANDO_IA"}:
            return jsonify({"message": "Analise ainda em processamento", "status": video.status}), 202
        return jsonify({"error": "Analise nao disponivel", "status": video.status}), 404

    return jsonify(
        {
            "video_id": video.id,
            "filename": video.filename,
            "status": video.status,
            "analysis": analysis,
        }
    )


def get_video_details(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404
    payload = video.to_dict()
    payload["analysis_ready"] = has_analysis(video.id)
    return jsonify(payload)


def update_video_status(video_id: int):
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    if not status:
        return jsonify({"error": "Campo status obrigatorio"}), 400

    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    update_status(video, str(status))
    return jsonify(video.to_dict())


def delete_video_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    delete_video(video)
    return jsonify({"message": "Video removido com sucesso"})


def home():
    return """
    <h1>DeMoviefy Backend</h1>
    <p>Servidor rodando com sucesso.</p>
    """
