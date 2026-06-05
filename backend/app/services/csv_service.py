from __future__ import annotations

import csv
import io
import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.transaction import Transaction


def parse_csv_preview(file_content: bytes) -> dict:
    try:
        text = file_content.decode("utf-8")
    except UnicodeDecodeError:
        text = file_content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    columns = reader.fieldnames or []
    preview_rows = []
    for i, row in enumerate(reader):
        if i >= 3:
            break
        preview_rows.append(dict(row))

    return {"columns": list(columns), "preview_rows": preview_rows}


def import_transactions(
    db: Session,
    user_id: str,
    file_content: bytes,
    mapping: dict,
) -> int:
    try:
        text = file_content.decode("utf-8")
    except UnicodeDecodeError:
        text = file_content.decode("latin-1")

    from app.crud.category import get_or_create_by_name

    reader = csv.DictReader(io.StringIO(text))
    count = 0

    for row in reader:
        try:
            # Resolve mapped column names
            date_col = mapping.get("date")
            amount_col = mapping.get("amount")
            description_col = mapping.get("description")
            type_col = mapping.get("type")
            category_col = mapping.get("category")
            currency_col = mapping.get("currency")

            if not date_col or not amount_col or not type_col:
                continue

            raw_date = row.get(date_col, "").strip()
            raw_amount = row.get(amount_col, "").strip()
            raw_type = row.get(type_col, "").strip().lower()
            raw_description = row.get(description_col or "", "").strip() if description_col else ""
            raw_category = row.get(category_col or "", "").strip() if category_col else "Imported"
            raw_currency = row.get(currency_col or "", "USD").strip() if currency_col else "USD"

            if not raw_date or not raw_amount or not raw_type:
                continue

            # Parse date
            parsed_date: date | None = None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y"):
                try:
                    from datetime import datetime as dt
                    parsed_date = dt.strptime(raw_date, fmt).date()
                    break
                except ValueError:
                    continue
            if parsed_date is None:
                continue

            # Parse amount
            try:
                amount = float(raw_amount.replace(",", "").replace("$", "").replace("€", ""))
            except ValueError:
                continue

            if raw_type not in ("income", "expense"):
                if raw_type in ("credit", "deposit", "in"):
                    raw_type = "income"
                else:
                    raw_type = "expense"

            currency = raw_currency if raw_currency else "USD"

            # Get or create category
            category = get_or_create_by_name(db, user_id, raw_category or "Imported", raw_type)

            transaction = Transaction(
                id=str(uuid.uuid4()),
                user_id=user_id,
                category_id=category.id,
                amount=amount,
                original_amount=amount,
                original_currency=currency,
                exchange_rate=1.0,
                date=parsed_date,
                description=raw_description,
                type=raw_type,
            )
            db.add(transaction)
            count += 1
        except Exception:
            continue

    db.commit()
    return count


def export_transactions(transactions: list) -> str:
    output = io.StringIO()
    fieldnames = ["date", "amount", "currency", "type", "category", "description"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for tx in transactions:
        category_name = tx.category.name if tx.category else ""
        writer.writerow(
            {
                "date": str(tx.date),
                "amount": float(tx.amount),
                "currency": tx.original_currency,
                "type": tx.type,
                "category": category_name,
                "description": tx.description or "",
            }
        )

    return output.getvalue()
