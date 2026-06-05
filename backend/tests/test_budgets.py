from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _create_category(client: TestClient, auth_headers: dict, name: str = "Budget Cat") -> str:
    response = client.post(
        "/api/v1/categories/",
        json={"name": name, "icon": "💰", "color": "#6366f1", "type": "expense"},
        headers=auth_headers,
    )
    return response.json()["id"]


def test_create_budget(client: TestClient, auth_headers: dict):
    cat_id = _create_category(client, auth_headers, "Food Budget")
    response = client.post(
        "/api/v1/budgets/",
        json={
            "category_id": cat_id,
            "year": 2025,
            "month": 6,
            "limit_amount": 500.0,
            "currency": "USD",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["category_id"] == cat_id
    assert data["year"] == 2025
    assert data["month"] == 6
    assert data["limit_amount"] == 500.0
    assert data["currency"] == "USD"
    assert "spent_amount" in data
    assert "id" in data


def test_get_budgets_with_spent(client: TestClient, auth_headers: dict):
    cat_id = _create_category(client, auth_headers, "Transport Budget")

    # Create budget
    budget_response = client.post(
        "/api/v1/budgets/",
        json={
            "category_id": cat_id,
            "year": 2025,
            "month": 7,
            "limit_amount": 300.0,
            "currency": "USD",
        },
        headers=auth_headers,
    )
    assert budget_response.status_code == 201

    # Create an expense in that category/month
    client.post(
        "/api/v1/transactions/",
        json={
            "category_id": cat_id,
            "amount": 50.0,
            "original_amount": 50.0,
            "original_currency": "USD",
            "date": "2025-07-10",
            "description": "Gas",
            "type": "expense",
        },
        headers=auth_headers,
    )

    # Get budgets for that month
    response = client.get("/api/v1/budgets/?year=2025&month=7", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    budget = next((b for b in data if b["category_id"] == cat_id), None)
    assert budget is not None
    assert budget["spent_amount"] == 50.0
    assert budget["limit_amount"] == 300.0


def test_delete_budget(client: TestClient, auth_headers: dict):
    cat_id = _create_category(client, auth_headers, "Delete Budget Cat")
    create_response = client.post(
        "/api/v1/budgets/",
        json={
            "category_id": cat_id,
            "year": 2025,
            "month": 8,
            "limit_amount": 200.0,
            "currency": "USD",
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    budget_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/budgets/{budget_id}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    # Verify it's gone
    get_response = client.get("/api/v1/budgets/?year=2025&month=8", headers=auth_headers)
    ids = [b["id"] for b in get_response.json()]
    assert budget_id not in ids
