import mimetypes
import threading
from pathlib import Path

from flask import current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from app.config.ai_settings import load_frame_ai_settings
from app.config.paths import (
    analysis_file_path,
    annotated_video_path,
    annotated_video_temp_path,
    ensure_storage_dirs,
    to_repo_relative,
    transcription_file_path,
    video_file_path,
)
from app.config.versioning import build_version_payload
from app.repositories.video_repository import (
    create_video,
    delete_video,
    get_video,
    list_videos as list_videos_repo,
    update_status,
)
from app.services.ai_catalog_service import get_model_by_relative_path, list_available_models
from app.services.frame_ai_service import has_analysis, load_analysis
from app.services.transcription_service import transcribe_video_with_timestamps, whisper_available
from app.services.video_artifact_service import (
    delete_analysis,
    delete_metadata,
    delete_transcription,
    has_transcription,
    load_ai_config,
    load_processing_state,
    load_transcription,
    save_ai_config,
    save_processing_state,
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
    annotated_path = annotated_video_path(video_id)
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
        "annotated_relative_path": to_repo_relative(annotated_path),
        "annotated_absolute_path": str(annotated_path),
        "annotated_exists": annotated_path.exists(),
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


def _parse_optional_float(raw_value, field_name: str) -> float | None:
    if raw_value in (None, "", "null"):
        return None
    try:
        return float(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Campo {field_name} precisa ser numerico.") from exc


def _parse_optional_int(raw_value, field_name: str) -> int | None:
    if raw_value in (None, "", "null"):
        return None
    try:
        return int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Campo {field_name} precisa ser inteiro.") from exc


def _resolve_clip_selection(payload_source) -> dict:
    clip_start_sec = _parse_optional_float(payload_source.get("clip_start_sec"), "clip_start_sec")
    clip_end_sec = _parse_optional_float(payload_source.get("clip_end_sec"), "clip_end_sec")

    clip_start_sec = 0.0 if clip_start_sec is None else clip_start_sec
    if clip_start_sec < 0:
        raise ValueError("O inicio do trecho nao pode ser negativo.")

    if clip_end_sec is not None and clip_end_sec <= clip_start_sec:
        raise ValueError("O fim do trecho precisa ser maior que o inicio.")

    return {
        "clip_start_sec": round(clip_start_sec, 2),
        "clip_end_sec": round(clip_end_sec, 2) if clip_end_sec is not None else None,
    }


def _resolve_runtime_settings(payload_source) -> dict:
    settings = load_frame_ai_settings()
    frame_stride = _parse_optional_int(payload_source.get("frame_stride"), "frame_stride")
    max_frames = _parse_optional_int(payload_source.get("max_frames"), "max_frames")
    confidence_threshold = _parse_optional_float(
        payload_source.get("confidence_threshold"),
        "confidence_threshold",
    )

    frame_stride = settings.frame_stride if frame_stride is None else frame_stride
    max_frames = settings.max_frames if max_frames is None else max_frames
    confidence_threshold = settings.confidence if confidence_threshold is None else confidence_threshold

    if frame_stride < 1:
        raise ValueError("frame_stride precisa ser pelo menos 1.")
    if max_frames < 1:
        raise ValueError("max_frames precisa ser pelo menos 1.")
    if not 0 <= confidence_threshold <= 1:
        raise ValueError("confidence_threshold precisa ficar entre 0 e 1.")

    return {
        "frame_stride": frame_stride,
        "max_frames": max_frames,
        "confidence_threshold": round(confidence_threshold, 4),
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
    item["annotated_url"] = f"/videos/{video.id}/annotated-file"
    item["analysis_url"] = f"/videos/{video.id}/analysis"
    item["transcription_url"] = f"/videos/{video.id}/transcription"
    item["ai_config"] = load_ai_config(video.id)
    item["processing"] = load_processing_state(video.id)
    item["storage"] = _storage_payload(video.id, video.filename)
    return item


def _empty_analysis_payload(video, ai_config: dict, storage: dict) -> dict:
    return {
        "video_id": video.id,
        "filename": video.filename,
        "status": video.status,
        "available": False,
        "message": "Analise ainda nao disponivel.",
        "ai_config": ai_config,
        "storage": storage,
        "analysis": {
            "video_path": storage["video_absolute_path"],
            "model_path": ai_config["model_path"],
            "task_type": ai_config["task_type"],
            "frame_stride": ai_config["frame_stride"],
            "confidence_threshold": ai_config["confidence_threshold"],
            "max_frames": ai_config["max_frames"],
            "clip_start_sec": ai_config["clip_start_sec"],
            "clip_end_sec": ai_config["clip_end_sec"],
            "video_duration_sec": None,
            "sampled_frames": 0,
            "processed_frames": 0,
            "total_detections": 0,
            "label_counts": {},
            "avg_confidence_by_label": {},
            "top_labels": [],
        },
    }


def _empty_transcription_payload(video, storage: dict, *, status: str, error: str | None = None) -> dict:
    return {
        "video_id": video.id,
        "filename": video.filename,
        "available": False,
        "storage": storage,
        "transcription": {
            "content": "",
            "source": "none",
            "language": None,
            "segments": [],
            "model_name": None,
            "status": status,
            "error": error,
        },
    }


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
        clip_config = _resolve_clip_selection(request.form)
        runtime_config = _resolve_runtime_settings(request.form)
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
        frame_stride=runtime_config["frame_stride"],
        confidence_threshold=runtime_config["confidence_threshold"],
        max_frames=runtime_config["max_frames"],
        clip_start_sec=clip_config["clip_start_sec"],
        clip_end_sec=clip_config["clip_end_sec"],
    )
    save_processing_state(
        new_video.id,
        progress=1,
        stage="queued",
        eta_seconds=None,
        message="Upload concluido. Aguardando inicio do processamento.",
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
                    "annotated_will_be_saved_in": to_repo_relative(annotated_video_path(new_video.id)),
                    "transcription_will_be_saved_in": f"uploads/transcriptions/video_{new_video.id}.json",
                    "analysis_status": "PROCESSANDO_IA",
                    "clip_selection": clip_config,
                    "runtime_settings": runtime_config,
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

    ai_config = load_ai_config(video.id)
    storage = _storage_payload(video.id, video.filename)
    analysis = load_analysis(video_id)
    if analysis is None:
        payload = _empty_analysis_payload(video, ai_config, storage)
        if video.status in {"PROCESSANDO", "PROCESSANDO_IA"}:
            payload["message"] = "Analise ainda em processamento."
            return jsonify(payload), 202
        payload["message"] = "Analise nao disponivel."
        return jsonify(payload), 404

    return jsonify(
        {
            "video_id": video.id,
            "filename": video.filename,
            "status": video.status,
            "available": True,
            "message": "Analise carregada com sucesso.",
            "analysis": analysis,
            "ai_config": ai_config,
            "storage": storage,
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

    storage = _storage_payload(video.id, video.filename)
    transcription = load_transcription(video_id)
    if transcription is None:
        if video.status in {"PROCESSANDO", "PROCESSANDO_IA"}:
            return jsonify(
                _empty_transcription_payload(
                    video,
                    storage,
                    status="pending",
                    error="A transcricao sera consultada novamente quando o processamento terminar.",
                )
            ), 202
        return jsonify(
            _empty_transcription_payload(
                video,
                storage,
                status="missing",
                error="Transcricao nao disponivel.",
            )
        ), 404

    return jsonify(
        {
            "video_id": video.id,
            "filename": video.filename,
            "available": True,
            "transcription": transcription,
            "storage": storage,
        }
    )


def generate_video_transcription_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    filepath = video_file_path(video.filename)
    if not filepath.exists():
        return jsonify({"error": "Arquivo de video nao encontrado"}), 404

    if not whisper_available():
        return (
            jsonify(
                {
                    "error": "Transcricao automatica indisponivel. Configure a .venv-transcription com Python 3.11/3.12 ou instale openai-whisper no ambiente atual.",
                }
            ),
            503,
        )

    payload = request.get_json(silent=True) or {}
    try:
        transcription = transcribe_video_with_timestamps(
            video_path=str(filepath),
            model_name=str(payload.get("model_name") or current_app.config.get("TRANSCRIPTION_MODEL", "base")),
            language=payload.get("language") or current_app.config.get("TRANSCRIPTION_LANGUAGE"),
            logger=current_app.logger,
        )
        saved = save_transcription(video_id, **transcription)
    except Exception as exc:
        current_app.logger.exception("transcription:failed video_id=%s", video_id)
        return jsonify({"error": str(exc)}), 500

    return jsonify(
        {
            "message": "Transcricao automatica gerada com sucesso",
            "video": _serialize_video(video),
            "transcription": saved,
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


def get_annotated_video_file(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    filepath = annotated_video_path(video.id)
    if not filepath.exists():
        if video.status in {"PROCESSANDO", "PROCESSANDO_IA"}:
            return jsonify({"message": "Video anotado ainda em processamento", "status": video.status}), 202
        return jsonify({"error": "Video anotado nao disponivel", "status": video.status}), 404

    return send_file(
        filepath,
        mimetype="video/mp4",
        as_attachment=False,
        download_name=filepath.name,
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
    return jsonify(_serialize_video(video))


def update_video_ai_config(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    payload = request.get_json(silent=True) or {}
    try:
        ai_config = _resolve_ai_config(payload.get("task_type"), payload.get("model_path"))
        clip_config = _resolve_clip_selection(payload)
        runtime_config = _resolve_runtime_settings(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    saved = save_ai_config(
        video.id,
        task_type=ai_config["task_type"],
        task_label=ai_config["task_label"],
        model_path=ai_config["model_path"],
        model_name=ai_config["model_name"],
        frame_stride=runtime_config["frame_stride"],
        confidence_threshold=runtime_config["confidence_threshold"],
        max_frames=runtime_config["max_frames"],
        clip_start_sec=clip_config["clip_start_sec"],
        clip_end_sec=clip_config["clip_end_sec"],
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
            clip_config = _resolve_clip_selection(payload)
            runtime_config = _resolve_runtime_settings(payload)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        save_ai_config(
            video.id,
            task_type=ai_config["task_type"],
            task_label=ai_config["task_label"],
            model_path=ai_config["model_path"],
            model_name=ai_config["model_name"],
            frame_stride=runtime_config["frame_stride"],
            confidence_threshold=runtime_config["confidence_threshold"],
            max_frames=runtime_config["max_frames"],
            clip_start_sec=clip_config["clip_start_sec"],
            clip_end_sec=clip_config["clip_end_sec"],
        )

    _start_processing_thread(video.id)
    return jsonify({"message": "Reprocessamento iniciado", "video": _serialize_video(video)})


def delete_video_by_id(video_id: int):
    video = get_video(video_id)
    if not video:
        return jsonify({"error": "Video nao encontrado"}), 404

    filepath = video_file_path(video.filename)
    analysis_path = analysis_file_path(video.id)
    annotated_path = annotated_video_path(video.id)
    annotated_temp_path = annotated_video_temp_path(video.id)
    delete_video(video)
    for path in (filepath, analysis_path, annotated_path, annotated_temp_path):
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


def get_system_version():
    return jsonify(
        {
            **build_version_payload(),
            "backend_name": "DeMoviefy Backend",
        }
    )


def home():
    return """
    <h1>DeMoviefy Backend</h1>
    <p>Servidor rodando com sucesso.</p>
    """