from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def get_all(db: Session, user_id: str) -> list[Category]:
    return db.query(Category).filter(Category.user_id == user_id).all()


def get_by_id(db: Session, user_id: str, cat_id: str) -> Category | None:
    return (
        db.query(Category)
        .filter(Category.user_id == user_id, Category.id == cat_id)
        .first()
    )


def create(db: Session, user_id: str, data: CategoryCreate) -> Category:
    category = Category(
        user_id=user_id,
        name=data.name,
        icon=data.icon,
        color=data.color,
        type=data.type,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update(db: Session, category: Category, data: CategoryUpdate) -> Category:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()


def get_or_create_by_name(
    db: Session, user_id: str, name: str, type: str = "expense"
) -> Category:
    category = (
        db.query(Category)
        .filter(Category.user_id == user_id, Category.name == name)
        .first()
    )
    if category is None:
        category = Category(
            user_id=user_id,
            name=name,
            type=type,
        )
        db.add(category)
        db.commit()
        db.refresh(category)
    return category
