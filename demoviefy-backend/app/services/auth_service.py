import os
from functools import wraps

from flask import current_app, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash

from app.repositories.user_repository import (
    admin_exists,
    create_user,
    find_user_by_email,
    find_user_by_id,
    find_user_by_username,
)

SESSION_USER_KEY = "demoviefy_user_id"


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    return check_password_hash(password_hash, password)


def create_initial_admin_if_needed() -> None:
    if admin_exists():
        return

    username = os.environ.get("DEMOVIEFY_ADMIN_USERNAME", "admin")
    email = os.environ.get("DEMOVIEFY_ADMIN_EMAIL", "admin@demoviefy.local")
    password = os.environ.get("DEMOVIEFY_ADMIN_PASSWORD", "admin123")

    if (
        "DEMOVIEFY_ADMIN_PASSWORD" not in os.environ
        or "DEMOVIEFY_ADMIN_EMAIL" not in os.environ
    ):
        current_app.logger.warning(
            "auth:bootstrap_admin_using_fallback_credentials configure DEMOVIEFY_ADMIN_EMAIL and DEMOVIEFY_ADMIN_PASSWORD in production"
        )

    create_user(
        username=username,
        email=email,
        password_hash=hash_password(password),
        is_admin=True,
    )
    current_app.logger.info("auth:bootstrap_admin_created email=%s", email)


def authenticate_user(identifier: str, password: str):
    identifier = (identifier or "").strip()
    password = password or ""
    if not identifier or not password:
        return None

    user = find_user_by_email(identifier) or find_user_by_username(identifier)
    if not user:
        return None

    if not verify_password(user.password_hash, password):
        return None

    return user


def login_user(user) -> dict:
    session[SESSION_USER_KEY] = user.id
    session.permanent = True
    return user.to_public_dict()


def logout_user() -> None:
    session.pop(SESSION_USER_KEY, None)


def get_current_user():
    user_id = session.get(SESSION_USER_KEY)
    if not user_id:
        return None
    return find_user_by_id(int(user_id))


def require_admin(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Autenticacao obrigatoria."}), 401
        if not user.is_admin:
            return jsonify({"error": "Acesso restrito a administradores."}), 403
        return view_func(*args, **kwargs)

    return wrapped
