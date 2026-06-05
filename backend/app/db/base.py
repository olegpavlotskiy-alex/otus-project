from __future__ import annotations

# Import all models so Alembic can discover them during autogenerate
from app.db.session import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.recurring import RecurringTransaction  # noqa: F401
from app.models.transaction import Transaction  # noqa: F401
from app.models.budget import Budget  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
