from flask import jsonify, request

from app.services.auth_service import (
    authenticate_user,
    get_current_user,
    login_user,
    logout_user,
)


def login():
    payload = request.get_json(silent=True) or {}
    identifier = str(payload.get("identifier", "")).strip()
    password = str(payload.get("password", ""))

    user = authenticate_user(identifier, password)
    if user is None:
        return jsonify({"error": "Credenciais invalidas."}), 401

    return jsonify(
        {
            "message": "Login realizado com sucesso.",
            "user": login_user(user),
        }
    )


def logout():
    logout_user()
    return jsonify({"message": "Sessao encerrada com sucesso."})


def me():
    user = get_current_user()
    if user is None:
        return jsonify({"authenticated": False, "user": None}), 200

    return jsonify(
        {
            "authenticated": True,
            "user": user.to_public_dict(),
        }
    )
