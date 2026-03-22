from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from app.config.ai_settings import load_frame_ai_settings
from app.config.paths import ANALYSIS_DIR, TRANSCRIPTIONS_DIR, UPLOADS_DIR, ensure_storage_dirs

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    ai_settings = load_frame_ai_settings()

    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///demoviefy.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOADS_DIR"] = str(UPLOADS_DIR)
    app.config["ANALYSIS_DIR"] = str(ANALYSIS_DIR)
    app.config["TRANSCRIPTIONS_DIR"] = str(TRANSCRIPTIONS_DIR)
    app.config["FRAME_AI_FRAME_STRIDE"] = ai_settings.frame_stride
    app.config["FRAME_AI_CONFIDENCE"] = ai_settings.confidence
    app.config["FRAME_AI_MAX_FRAMES"] = ai_settings.max_frames

    CORS(app)
    db.init_app(app)
    ensure_storage_dirs()

    from .routes.video_routes import video_bp
    app.register_blueprint(video_bp)

    # Criar banco automaticamente
    with app.app_context():
        db.create_all()

    return app
