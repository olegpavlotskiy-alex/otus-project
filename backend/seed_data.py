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

    # --- Categories ---
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

    # user1 categories (12 total)
    food_cat          = _get_or_create_category(user1.id, "Food & Dining",    "🍔", "#ef4444", "expense")
    transport_cat     = _get_or_create_category(user1.id, "Transport",        "🚗", "#f97316", "expense")
    shopping_cat      = _get_or_create_category(user1.id, "Shopping",         "🛍️", "#eab308", "expense")
    entertainment_cat = _get_or_create_category(user1.id, "Entertainment",    "🎬", "#8b5cf6", "expense")
    health_cat        = _get_or_create_category(user1.id, "Health & Fitness", "💪", "#22c55e", "expense")
    utilities_cat     = _get_or_create_category(user1.id, "Utilities",        "💡", "#06b6d4", "expense")
    housing_cat       = _get_or_create_category(user1.id, "Housing",          "🏠", "#64748b", "expense")
    subscriptions_cat = _get_or_create_category(user1.id, "Subscriptions",    "📱", "#ec4899", "expense")
    education_cat     = _get_or_create_category(user1.id, "Education",        "📚", "#7c3aed", "expense")
    travel_cat        = _get_or_create_category(user1.id, "Travel",           "✈️", "#0ea5e9", "expense")
    salary_cat        = _get_or_create_category(user1.id, "Salary",           "💼", "#10b981", "income")
    freelance_cat     = _get_or_create_category(user1.id, "Freelance",        "💻", "#3b82f6", "income")

    # user2 categories (12 total)
    u2_food          = _get_or_create_category(user2.id, "Food & Dining",    "🍔", "#ef4444", "expense")
    u2_transport     = _get_or_create_category(user2.id, "Transport",        "🚗", "#f97316", "expense")
    u2_shopping      = _get_or_create_category(user2.id, "Shopping",         "🛍️", "#eab308", "expense")
    u2_entertainment = _get_or_create_category(user2.id, "Entertainment",    "🎬", "#8b5cf6", "expense")
    u2_health        = _get_or_create_category(user2.id, "Health & Fitness", "💪", "#22c55e", "expense")
    u2_utilities     = _get_or_create_category(user2.id, "Utilities",        "💡", "#06b6d4", "expense")
    u2_housing       = _get_or_create_category(user2.id, "Housing",          "🏠", "#64748b", "expense")
    u2_subscriptions = _get_or_create_category(user2.id, "Subscriptions",    "📱", "#ec4899", "expense")
    u2_education     = _get_or_create_category(user2.id, "Education",        "📚", "#7c3aed", "expense")
    u2_travel        = _get_or_create_category(user2.id, "Travel",           "✈️", "#0ea5e9", "expense")
    u2_salary        = _get_or_create_category(user2.id, "Salary",           "💼", "#10b981", "income")
    u2_freelance     = _get_or_create_category(user2.id, "Freelance",        "💻", "#3b82f6", "income")

    import calendar

    today = date.today()

    # --- Transactions helper ---
    def _generate_transactions(
        user_id,
        salary_category,
        freelance_category,
        housing_category,
        expense_categories,
        salary_amount,
        currency,
        exchange_rate,
        rng_instance,
    ):
        transactions = []
        for month_offset in range(6):
            target_date = today - timedelta(days=30 * month_offset)
            year = target_date.year
            month = target_date.month
            last_day = calendar.monthrange(year, month)[1]

            # Salary on the 1st
            transactions.append(Transaction(
                id=str(uuid.uuid4()),
                user_id=user_id,
                category_id=salary_category.id,
                amount=salary_amount,
                original_amount=salary_amount,
                original_currency=currency,
                exchange_rate=exchange_rate,
                date=date(year, month, 1),
                description="Monthly salary",
                type="income",
            ))

            # Freelance (not every month, ~60% chance)
            if rng_instance.random() > 0.4:
                fl_day = min(rng_instance.randint(5, 25), last_day)
                fl_amount = round(rng_instance.uniform(300, 1500), 2)
                transactions.append(Transaction(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    category_id=freelance_category.id,
                    amount=fl_amount,
                    original_amount=fl_amount,
                    original_currency=currency,
                    exchange_rate=exchange_rate,
                    date=date(year, month, fl_day),
                    description="Freelance project payment",
                    type="income",
                ))

            # Expenses: 34-38 per month — guarantees 200+ per user over 6 months
            for _ in range(rng_instance.randint(34, 38)):
                cat, min_amt, max_amt = rng_instance.choice(expense_categories)
                if cat == housing_category:
                    tx_day = 1
                    tx_amount = round(rng_instance.uniform(1200, 1400), 2)
                    desc = "Monthly rent"
                else:
                    tx_day = rng_instance.randint(1, last_day)
                    tx_amount = round(rng_instance.uniform(min_amt, max_amt), 2)
                    desc = rng_instance.choice([
                        "Purchase", "Payment", "Bill", "Order", "Service",
                    ])
                transactions.append(Transaction(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    category_id=cat.id,
                    amount=tx_amount,
                    original_amount=tx_amount,
                    original_currency=currency,
                    exchange_rate=exchange_rate,
                    date=date(year, month, min(tx_day, last_day)),
                    description=desc,
                    type="expense",
                ))
        return transactions

    # --- Transactions for user1 ---
    existing_tx_count_u1 = db.query(Transaction).filter(Transaction.user_id == user1.id).count()
    if existing_tx_count_u1 == 0:
        u1_expense_cats = [
            (food_cat,          15,  120),
            (transport_cat,     10,   80),
            (shopping_cat,      20,  300),
            (entertainment_cat, 10,  100),
            (health_cat,        20,  150),
            (utilities_cat,     50,  200),
            (housing_cat,      800, 1500),
            (subscriptions_cat,  5,   30),
            (education_cat,     30,  250),
            (travel_cat,       100,  800),
        ]
        txs = _generate_transactions(
            user1.id, salary_cat, freelance_cat, housing_cat,
            u1_expense_cats, 5000.0, "USD", 1.0, rng,
        )
        db.bulk_save_objects(txs)
        db.flush()

    # --- Transactions for user2 ---
    existing_tx_count_u2 = db.query(Transaction).filter(Transaction.user_id == user2.id).count()
    if existing_tx_count_u2 == 0:
        rng2 = random.Random(99)  # separate seed so user2 data differs from user1
        u2_expense_cats = [
            (u2_food,          20,  150),
            (u2_transport,     15,  100),
            (u2_shopping,      30,  400),
            (u2_entertainment, 15,  120),
            (u2_health,        25,  180),
            (u2_utilities,     60,  250),
            (u2_housing,      900, 1800),
            (u2_subscriptions,  8,   40),
            (u2_education,     40,  300),
            (u2_travel,       120,  900),
        ]
        # EUR user: exchange_rate=1.0 because transactions are in preferred currency (EUR)
        txs2 = _generate_transactions(
            user2.id, u2_salary, u2_freelance, u2_housing,
            u2_expense_cats, 4500.0, "EUR", 1.0, rng2,
        )
        db.bulk_save_objects(txs2)
        db.flush()

        # Cross-currency demo: a few USD purchases for user2 (EUR account)
        # EUR/USD rate ≈ 0.92 means 1 USD = 0.92 EUR
        EUR_PER_USD = 0.92
        cross_currency_txs = [
            Transaction(
                id=str(uuid.uuid4()),
                user_id=user2.id,
                category_id=u2_travel.id,
                original_amount=220.0,
                original_currency="USD",
                exchange_rate=EUR_PER_USD,
                amount=round(220.0 * EUR_PER_USD, 2),
                date=today - timedelta(days=15),
                description="Hotel booking (USD)",
                type="expense",
            ),
            Transaction(
                id=str(uuid.uuid4()),
                user_id=user2.id,
                category_id=u2_shopping.id,
                original_amount=89.99,
                original_currency="USD",
                exchange_rate=EUR_PER_USD,
                amount=round(89.99 * EUR_PER_USD, 2),
                date=today - timedelta(days=30),
                description="Online purchase (USD)",
                type="expense",
            ),
            Transaction(
                id=str(uuid.uuid4()),
                user_id=user2.id,
                category_id=u2_freelance.id,
                original_amount=500.0,
                original_currency="USD",
                exchange_rate=EUR_PER_USD,
                amount=round(500.0 * EUR_PER_USD, 2),
                date=today - timedelta(days=45),
                description="Freelance payment (USD client)",
                type="income",
            ),
        ]
        db.bulk_save_objects(cross_currency_txs)
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

    _get_or_create_budget(user1.id, food_cat.id,          this_year, this_month, 800.0)
    _get_or_create_budget(user1.id, transport_cat.id,     this_year, this_month, 300.0)
    _get_or_create_budget(user1.id, entertainment_cat.id, this_year, this_month, 200.0)

    # --- Budgets for user2 (current month) ---
    _get_or_create_budget(user2.id, u2_food.id,      this_year, this_month, 700.0,  "EUR")
    _get_or_create_budget(user2.id, u2_housing.id,   this_year, this_month, 1500.0, "EUR")
    _get_or_create_budget(user2.id, u2_shopping.id,  this_year, this_month, 400.0,  "EUR")

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

    # --- Recurring transactions for user2 ---
    _get_or_create_recurring(
        user2.id, u2_subscriptions.id, 12.99, "EUR",
        "Streaming service", "expense", "monthly",
        date(today.year, today.month, 10) if today.day < 10 else next_month_date.replace(day=10),
    )
    _get_or_create_recurring(
        user2.id, u2_salary.id, 4500.0, "EUR",
        "Monthly salary", "income", "monthly",
        next_month_date.replace(day=1),
    )

    db.commit()
    print("Seed data created successfully.")
