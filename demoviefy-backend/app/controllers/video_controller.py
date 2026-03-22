import mimetypes
import threading
from pathlib import Path

from flask import current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from app.config.ai_settings import load_frame_ai_settings
from app.config.paths import (
    analysis_file_path,
    ensure_storage_dirs,
    to_repo_relative,
    transcription_file_path,
    video_file_path,
)
from app.repositories.video_repository import (
    create_video,
    delete_video,
    get_video,
    list_videos as list_videos_repo,
    update_status,
)
from app.services.ai_catalog_service import get_model_by_relative_path, list_available_models
from app.services.frame_ai_service import has_analysis, load_analysis
from app.services.video_artifact_service import (
    delete_analysis,
    delete_metadata,
    delete_transcription,
    has_transcription,
    load_ai_config,
    load_transcription,
    save_ai_config,
    save_transcription,
    update_analysis,
)
from app.services.video_service import process_video


ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def _is_allowed_video(filename: str) -> bool:
    extension = Path(filename).suffix.lower()
    return extension in ALLOWED_VIDEO_EXTENSIONS


def _storage_payload(video_id: int, filename: str) -> dict:
    video_path = video_file_path(filename)
    analysis_path = analysis_file_path(video_id)
    video_exists = video_path.exists()
    analysis_exists = analysis_path.exists()
    transcription_path = transcription_file_path(video_id)

    return {
        "video_relative_path": to_repo_relative(video_path),
        "video_absolute_path": str(video_path),
        "video_exists": video_exists,
        "analysis_relative_path": to_repo_relative(analysis_path),
        "analysis_absolute_path": str(analysis_path),
        "analysis_exists": analysis_exists,
        "transcription_relative_path": to_repo_relative(transcription_path),
        "transcription_absolute_path": str(transcription_path),
        "transcription_exists": has_transcription(video_id),
    }


def _resolve_ai_config(task_type: str | None, model_reference: str | None) -> dict:
    settings = load_frame_ai_settings()
    catalog = list_available_models()
    fallback_model = get_model_by_relative_path(to_repo_relative(Path(settings.model_path)))

    if model_reference:
        model = get_model_by_relative_path(model_reference)
        if model is None:
            raise ValueError("Modelo de IA nao encontrado.")
    else:
        requested_task = task_type or settings.task_type
        model = next((entry for entry in catalog if entry["task_type"] == requested_task), fallback_model)

    if model is None:
        raise ValueError("Nenhum modelo disponivel para a tarefa escolhida.")

    resolved_task = task_type or model["task_type"]
    if model["task_type"] != resolved_task:
        raise ValueError("O modelo selecionado nao pertence a tarefa escolhida.")

    return {
        "task_type": resolved_task,
        "task_label": model["task_label"],
        "model_path": model["absolute_path"],
        "model_relative_path": model["relative_path"],
        "model_name": model["name"],
    }


def _start_processing_thread(video_id: int) -> None:
    flask_app = current_app._get_current_object()
    # Processing runs off-request so uploads stay responsive even for larger
    # videos and the same endpoint can be reused for manual reprocessing.
    thread = threading.Thread(target=process_video, args=(flask_app, video_id), daemon=True)
    thread.start()
    current_app.logger.info("video:processing_thread_started video_id=%s", video_id)


def _serialize_video(video) -> dict:
    item = video.to_dict()
    item["analysis_ready"] = has_analysis(video.id)
    item["transcription_ready"] = has_transcription(video.id)
    item["video_url"] = f"/videos/{video.id}/file"
    item["analysis_url"] = f"/videos/{video.id}/analysis"
    item["transcription_url"] = f"/videos/{video.id}/transcription"
    item["ai_config"] = load_ai_config(video.id)
    item["storage"] = _storage_payload(video.id, video.filename)
    return item


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

    try:
        ai_config = _resolve_ai_config(
            request.form.get("ai_task") or request.form.get("task_type"),
            request.form.get("model_path"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    ensure_storage_dirs()
    filepath = video_file_path(filename)
    file.save(filepath)
    current_app.logger.info("upload_video:saved filename=%s path=%s", filename, filepath)

    new_video = create_video(filename=filename)
    save_ai_config(
        new_video.id,
        task_type=ai_config["task_type"],
        task_label=ai_config["task_label"],
        model_path=ai_config["model_path"],
        model_name=ai_config["model_name"],
    )
    current_app.logger.info("upload_video:db_saved video_id=%s", new_video.id)

    _start_processing_thread(new_video.id)

    return jsonify(
        {
            "message": "Upload realizado com sucesso",
            "video": _serialize_video(new_video),
            "next_steps": {
                "video_saved_in": to_repo_relative(filepath),
                "analysis_will_be_saved_in": to_repo_relative(analysis_file_path(new_video.id)),
                "transcription_will_be_saved_in": f"uploads/transcriptions/video_{new_video.id}.json",
                "analysis_status": "PROCESSANDO_IA",
            },
        }
    )


def list_videos():
    videos = list_videos_repo()
    payload = [_serialize_video(video) for video in videos]
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
            "ai_config": load_ai_config(video.id),
            "storage": _storage_payload(video.id, video.filename),
        }
    )


def update_video_analysis_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    payload = request.get_json(silent=True) or {}
    analysis = payload.get("analysis", payload)
    if not isinstance(analysis, dict):
        return jsonify({"error": "Payload de analise invalido"}), 400

    update_analysis(video_id, analysis)
    update_status(video, "PROCESSADO")
    return jsonify(
        {
            "message": "Analise atualizada com sucesso",
            "video": _serialize_video(video),
            "analysis": analysis,
        }
    )


def delete_video_analysis_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    delete_analysis(video_id)
    update_status(video, "SEM_ANALISE")
    return jsonify({"message": "Analise removida com sucesso", "video": _serialize_video(video)})


def get_video_transcription(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    transcription = load_transcription(video_id)
    if transcription is None:
        return jsonify({"error": "Transcricao nao disponivel"}), 404

    return jsonify(
        {
            "video_id": video.id,
            "filename": video.filename,
            "transcription": transcription,
            "storage": _storage_payload(video.id, video.filename),
        }
    )


def update_video_transcription_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    payload = request.get_json(silent=True) or {}
    content = str(payload.get("content", "")).strip()
    if not content:
        return jsonify({"error": "Conteudo da transcricao obrigatorio"}), 400

    transcription = save_transcription(
        video_id,
        content=content,
        source=str(payload.get("source", "manual")),
        language=payload.get("language"),
    )
    return jsonify(
        {
            "message": "Transcricao atualizada com sucesso",
            "video": _serialize_video(video),
            "transcription": transcription,
        }
    )


def delete_video_transcription_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    delete_transcription(video_id)
    return jsonify({"message": "Transcricao removida com sucesso", "video": _serialize_video(video)})


def get_video_details(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404
    return jsonify(_serialize_video(video))


def get_video_file(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    filepath = video_file_path(video.filename)
    if not filepath.exists():
        return jsonify({"error": "Arquivo de video nao encontrado"}), 404

    mimetype, _ = mimetypes.guess_type(str(filepath))
    return send_file(
        filepath,
        mimetype=mimetype or "application/octet-stream",
        as_attachment=False,
        download_name=video.filename,
    )


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


def update_video_ai_config(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    payload = request.get_json(silent=True) or {}
    try:
        ai_config = _resolve_ai_config(payload.get("task_type"), payload.get("model_path"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    saved = save_ai_config(
        video.id,
        task_type=ai_config["task_type"],
        task_label=ai_config["task_label"],
        model_path=ai_config["model_path"],
        model_name=ai_config["model_name"],
    )
    return jsonify({"message": "Configuracao de IA atualizada", "ai_config": saved, "video": _serialize_video(video)})


def reprocess_video_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    payload = request.get_json(silent=True) or {}
    if payload:
        try:
            ai_config = _resolve_ai_config(payload.get("task_type"), payload.get("model_path"))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        save_ai_config(
            video.id,
            task_type=ai_config["task_type"],
            task_label=ai_config["task_label"],
            model_path=ai_config["model_path"],
            model_name=ai_config["model_name"],
        )

    _start_processing_thread(video.id)
    return jsonify({"message": "Reprocessamento iniciado", "video": _serialize_video(video)})


def delete_video_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    filepath = video_file_path(video.filename)
    analysis_path = analysis_file_path(video.id)
    delete_video(video)
    for path in (filepath, analysis_path):
        if path.exists():
            path.unlink()
    delete_transcription(video_id)
    delete_metadata(video_id)
    return jsonify({"message": "Video removido com sucesso"})


def list_ai_models():
    models = list_available_models()
    tasks = sorted({(model["task_type"], model["task_label"]) for model in models})
    return jsonify(
        {
            "models": models,
            "tasks": [{"task_type": task_type, "task_label": task_label} for task_type, task_label in tasks],
        }
    )


def home():
    return """
    <h1>DeMoviefy Backend</h1>
    <p>Servidor rodando com sucesso.</p>
    """
