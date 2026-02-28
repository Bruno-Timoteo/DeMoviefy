from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///demoviefy.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    CORS(app)
    db.init_app(app)

    from .routes.video_routes import video_bp
    app.register_blueprint(video_bp)

    # Criar banco automaticamente
    with app.app_context():
        db.create_all()

    return app