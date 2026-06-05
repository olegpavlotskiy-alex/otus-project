from __future__ import annotations

import random
import uuid
from datetime import date, timedelta

from sqlalchemy.orm import Session


def seed(db: Session) -> None:
    from app.core.security import get_password_hash
    from app.models.budget import Budget
    from app.models.category import Category
    from app.models.recurring import RecurringTransaction
    from app.models.transaction import Transaction
    from app.models.user import User

    rng = random.Random(42)  # deterministic seed

    # --- Users ---
    user1 = db.query(User).filter(User.email == "john@example.com").first()
    if not user1:
        user1 = User(
            id=str(uuid.uuid4()),
            email="john@example.com",
            name="John Smith",
            password_hash=get_password_hash("password123"),
            preferred_currency="USD",
        )
        db.add(user1)
        db.flush()

    user2 = db.query(User).filter(User.email == "family@example.com").first()
    if not user2:
        user2 = User(
            id=str(uuid.uuid4()),
            email="family@example.com",
            name="Family Account",
            password_hash=get_password_hash("password123"),
            preferred_currency="EUR",
        )
        db.add(user2)
        db.flush()

    # --- Categories for user1 ---
    def _get_or_create_category(user_id, name, icon, color, cat_type):
        cat = (
            db.query(Category)
            .filter(Category.user_id == user_id, Category.name == name)
            .first()
        )
        if not cat:
            cat = Category(
                id=str(uuid.uuid4()),
                user_id=user_id,
                name=name,
                icon=icon,
                color=color,
                type=cat_type,
            )
            db.add(cat)
            db.flush()
        return cat

    # user1 categories
    food_cat = _get_or_create_category(user1.id, "Food & Dining", "🍔", "#ef4444", "expense")
    transport_cat = _get_or_create_category(user1.id, "Transport", "🚗", "#f97316", "expense")
    shopping_cat = _get_or_create_category(user1.id, "Shopping", "🛍️", "#eab308", "expense")
    entertainment_cat = _get_or_create_category(user1.id, "Entertainment", "🎬", "#8b5cf6", "expense")
    health_cat = _get_or_create_category(user1.id, "Health & Fitness", "💪", "#22c55e", "expense")
    utilities_cat = _get_or_create_category(user1.id, "Utilities", "💡", "#06b6d4", "expense")
    housing_cat = _get_or_create_category(user1.id, "Housing", "🏠", "#64748b", "expense")
    subscriptions_cat = _get_or_create_category(user1.id, "Subscriptions", "📱", "#ec4899", "expense")
    salary_cat = _get_or_create_category(user1.id, "Salary", "💼", "#10b981", "income")
    freelance_cat = _get_or_create_category(user1.id, "Freelance", "💻", "#3b82f6", "income")

    # user2 categories
    u2_food = _get_or_create_category(user2.id, "Food & Dining", "🍔", "#ef4444", "expense")
    u2_transport = _get_or_create_category(user2.id, "Transport", "🚗", "#f97316", "expense")
    u2_salary = _get_or_create_category(user2.id, "Salary", "💼", "#10b981", "income")
    u2_shopping = _get_or_create_category(user2.id, "Shopping", "🛍️", "#eab308", "expense")

    # --- Transactions for user1 (200+ over 6 months) ---
    today = date.today()

    expense_categories = [
        (food_cat, 15, 120),
        (transport_cat, 10, 80),
        (shopping_cat, 20, 300),
        (entertainment_cat, 10, 100),
        (health_cat, 20, 150),
        (utilities_cat, 50, 200),
        (housing_cat, 800, 1500),
        (subscriptions_cat, 5, 30),
    ]

    existing_tx_count = db.query(Transaction).filter(Transaction.user_id == user1.id).count()
    if existing_tx_count == 0:
        transactions_to_add = []

        for month_offset in range(6):
            target_date = today - timedelta(days=30 * month_offset)
            year = target_date.year
            month = target_date.month

            import calendar
            last_day = calendar.monthrange(year, month)[1]

            # Salary on the 1st
            salary_date = date(year, month, 1)
            transactions_to_add.append(Transaction(
                id=str(uuid.uuid4()),
                user_id=user1.id,
                category_id=salary_cat.id,
                amount=5000.0,
                original_amount=5000.0,
                original_currency="USD",
                exchange_rate=1.0,
                date=salary_date,
                description="Monthly salary",
                type="income",
            ))

            # Freelance on random day (not every month)
            if rng.random() > 0.4:
                fl_day = rng.randint(5, 25)
                fl_day = min(fl_day, last_day)
                fl_amount = rng.uniform(300, 1500)
                transactions_to_add.append(Transaction(
                    id=str(uuid.uuid4()),
                    user_id=user1.id,
                    category_id=freelance_cat.id,
                    amount=round(fl_amount, 2),
                    original_amount=round(fl_amount, 2),
                    original_currency="USD",
                    exchange_rate=1.0,
                    date=date(year, month, fl_day),
                    description="Freelance project payment",
                    type="income",
                ))

            # Expense transactions - roughly 30-35 per month
            for _ in range(rng.randint(28, 35)):
                cat, min_amt, max_amt = rng.choice(expense_categories)
                # Housing is once per month
                if cat == housing_cat:
                    tx_day = 1
                    tx_amount = round(rng.uniform(1200, 1400), 2)
                    desc = "Monthly rent"
                else:
                    tx_day = rng.randint(1, last_day)
                    tx_amount = round(rng.uniform(min_amt, max_amt), 2)
                    descriptions = {
                        food_cat.id: ["Grocery store", "Restaurant", "Coffee shop", "Fast food", "Lunch delivery"],
                        transport_cat.id: ["Gas station", "Uber ride", "Bus pass", "Parking", "Car wash"],
                        shopping_cat.id: ["Amazon purchase", "Clothing store", "Electronics", "Home goods", "Sports gear"],
                        entertainment_cat.id: ["Movie tickets", "Concert", "Video game", "Streaming service", "Books"],
                        health_cat.id: ["Gym membership", "Pharmacy", "Doctor visit", "Vitamins", "Yoga class"],
                        utilities_cat.id: ["Electric bill", "Water bill", "Internet", "Phone bill", "Gas bill"],
                        subscriptions_cat.id: ["Netflix", "Spotify", "Adobe CC", "GitHub", "Cloud storage"],
                    }
                    descs = descriptions.get(cat.id, ["Purchase"])
                    desc = rng.choice(descs)

                transactions_to_add.append(Transaction(
                    id=str(uuid.uuid4()),
                    user_id=user1.id,
                    category_id=cat.id,
                    amount=tx_amount,
                    original_amount=tx_amount,
                    original_currency="USD",
                    exchange_rate=1.0,
                    date=date(year, month, min(tx_day, last_day)),
                    description=desc,
                    type="expense",
                ))

        db.bulk_save_objects(transactions_to_add)
        db.flush()

    # --- Budgets for user1 (current month) ---
    this_year = today.year
    this_month = today.month

    def _get_or_create_budget(user_id, category_id, year, month, limit_amount, currency="USD"):
        budget = (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.category_id == category_id,
                Budget.year == year,
                Budget.month == month,
            )
            .first()
        )
        if not budget:
            budget = Budget(
                id=str(uuid.uuid4()),
                user_id=user_id,
                category_id=category_id,
                year=year,
                month=month,
                limit_amount=limit_amount,
                currency=currency,
            )
            db.add(budget)
            db.flush()
        return budget

    _get_or_create_budget(user1.id, food_cat.id, this_year, this_month, 800.0)
    _get_or_create_budget(user1.id, transport_cat.id, this_year, this_month, 300.0)
    _get_or_create_budget(user1.id, entertainment_cat.id, this_year, this_month, 200.0)

    # --- Recurring transactions for user1 ---
    def _get_or_create_recurring(user_id, category_id, amount, currency, description, tx_type, frequency, next_date):
        rec = (
            db.query(RecurringTransaction)
            .filter(
                RecurringTransaction.user_id == user_id,
                RecurringTransaction.description == description,
            )
            .first()
        )
        if not rec:
            rec = RecurringTransaction(
                id=str(uuid.uuid4()),
                user_id=user_id,
                category_id=category_id,
                amount=amount,
                currency=currency,
                description=description,
                type=tx_type,
                frequency=frequency,
                next_date=next_date,
                is_active=True,
            )
            db.add(rec)
            db.flush()
        return rec

    import calendar as cal_module
    next_month_date = today.replace(day=1) + timedelta(days=cal_module.monthrange(today.year, today.month)[1])

    _get_or_create_recurring(
        user1.id, subscriptions_cat.id, 15.99, "USD",
        "Netflix subscription", "expense", "monthly",
        date(today.year, today.month, 15) if today.day < 15 else next_month_date.replace(day=15),
    )
    _get_or_create_recurring(
        user1.id, health_cat.id, 49.99, "USD",
        "Gym membership", "expense", "monthly",
        date(today.year, today.month, 5) if today.day < 5 else next_month_date.replace(day=5),
    )
    _get_or_create_recurring(
        user1.id, salary_cat.id, 5000.0, "USD",
        "Monthly salary", "income", "monthly",
        next_month_date.replace(day=1),
    )

    db.commit()
    print("Seed data created successfully.")
