from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create(db: Session, user_create: UserCreate) -> User:
    user = User(
        email=user_create.email,
        name=user_create.name,
        password_hash=get_password_hash(user_create.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
