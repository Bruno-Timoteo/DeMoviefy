from sqlalchemy import func

from app import db
from app.models.user import User


def create_user(*, username: str, email: str, password_hash: str, is_admin: bool) -> User:
    user = User(
        username=username.strip(),
        email=email.strip().lower(),
        password_hash=password_hash,
        is_admin=is_admin,
    )
    db.session.add(user)
    db.session.commit()
    return user


def find_user_by_id(user_id: int) -> User | None:
    return db.session.get(User, user_id)


def find_user_by_email(email: str) -> User | None:
    normalized_email = email.strip().lower()
    return User.query.filter(func.lower(User.email) == normalized_email).first()


def find_user_by_username(username: str) -> User | None:
    normalized_username = username.strip().lower()
    return User.query.filter(func.lower(User.username) == normalized_username).first()


def admin_exists() -> bool:
    return User.query.filter(User.is_admin.is_(True)).first() is not None
