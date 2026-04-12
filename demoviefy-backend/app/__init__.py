import os

from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from app.config.ai_settings import load_frame_ai_settings
from app.config.paths import (
    ANALYSIS_DIR,
    ANNOTATED_DIR,
    TRANSCRIPTION_ENV_DIR,
    TRANSCRIPTIONS_DIR,
    UPLOADS_DIR,
    ensure_storage_dirs,
)
from app.config.versioning import API_CONTRACT_VERSION, BACKEND_APP_VERSION
from app.services.metadata_migration_service import migrate_metadata_files

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    ai_settings = load_frame_ai_settings()

    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///demoviefy.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOADS_DIR"] = str(UPLOADS_DIR)
    app.config["ANALYSIS_DIR"] = str(ANALYSIS_DIR)
    app.config["ANNOTATED_DIR"] = str(ANNOTATED_DIR)
    app.config["TRANSCRIPTIONS_DIR"] = str(TRANSCRIPTIONS_DIR)
    app.config["FRAME_AI_FRAME_STRIDE"] = ai_settings.frame_stride
    app.config["FRAME_AI_CONFIDENCE"] = ai_settings.confidence
    app.config["FRAME_AI_MAX_FRAMES"] = ai_settings.max_frames
    app.config["AUTO_TRANSCRIPTION_ENABLED"] = True
    app.config["TRANSCRIPTION_MODEL"] = "base"
    app.config["TRANSCRIPTION_LANGUAGE"] = None
    app.config["TRANSCRIPTION_ENV_DIR"] = str(TRANSCRIPTION_ENV_DIR)
    app.config["TRANSCRIPTION_PYTHON"] = os.environ.get("DEMOVIEFY_TRANSCRIPTION_PYTHON")
    app.config["BACKEND_APP_VERSION"] = BACKEND_APP_VERSION
    app.config["API_CONTRACT_VERSION"] = API_CONTRACT_VERSION

    CORS(app)
    db.init_app(app)
    ensure_storage_dirs()

    from .routes.video_routes import video_bp
    app.register_blueprint(video_bp)

    # Criar banco automaticamente
    with app.app_context():
        from app.models.video import Video

        db.create_all()
        migrate_metadata_files(video_ids=[video.id for video in Video.query.all()], logger=app.logger)

    return app
