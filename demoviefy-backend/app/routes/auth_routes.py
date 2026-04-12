from flask import Blueprint

from app.controllers.auth_controller import login, logout, me

auth_bp = Blueprint("auth", __name__)

auth_bp.add_url_rule("/auth/login", view_func=login, methods=["POST"])
auth_bp.add_url_rule("/auth/logout", view_func=logout, methods=["POST"])
auth_bp.add_url_rule("/auth/me", view_func=me, methods=["GET"])
