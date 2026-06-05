from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _create_category(client: TestClient, auth_headers: dict, name: str = "Test Category") -> str:
    response = client.post(
        "/api/v1/categories/",
        json={"name": name, "icon": "💰", "color": "#6366f1", "type": "expense"},
        headers=auth_headers,
    )
    return response.json()["id"]


def test_create_transaction(client: TestClient, auth_headers: dict):
    cat_id = _create_category(client, auth_headers, "Food Test")
    response = client.post(
        "/api/v1/transactions/",
        json={
            "category_id": cat_id,
            "amount": 45.50,
            "original_amount": 45.50,
            "original_currency": "USD",
            "exchange_rate": 1.0,
            "date": "2025-01-15",
            "description": "Dinner out",
            "type": "expense",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 45.50
    assert data["description"] == "Dinner out"
    assert data["type"] == "expense"
    assert data["category_id"] == cat_id
    assert "id" in data


def test_get_transactions_paginated(client: TestClient, auth_headers: dict):
    cat_id = _create_category(client, auth_headers, "Transport Test")
    # Create a few transactions
    for i in range(3):
        client.post(
            "/api/v1/transactions/",
            json={
                "category_id": cat_id,
                "amount": 10.0 + i,
                "original_amount": 10.0 + i,
                "original_currency": "USD",
                "date": f"2025-02-{10 + i:02d}",
                "description": f"Transaction {i}",
                "type": "expense",
            },
            headers=auth_headers,
        )

    response = client.get("/api/v1/transactions/?page=1&size=20", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "pages" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 3


def test_filter_transactions_by_date(client: TestClient, auth_headers: dict):
    cat_id = _create_category(client, auth_headers, "Filter Test Cat")
    # Create transactions in different months
    client.post(
        "/api/v1/transactions/",
        json={
            "category_id": cat_id,
            "amount": 100.0,
            "original_amount": 100.0,
            "original_currency": "USD",
            "date": "2025-03-01",
            "description": "March tx",
            "type": "expense",
        },
        headers=auth_headers,
    )
    client.post(
        "/api/v1/transactions/",
        json={
            "category_id": cat_id,
            "amount": 200.0,
            "original_amount": 200.0,
            "original_currency": "USD",
            "date": "2025-04-01",
            "description": "April tx",
            "type": "expense",
        },
        headers=auth_headers,
    )

    # Filter for March only
    response = client.get(
        "/api/v1/transactions/?date_from=2025-03-01&date_to=2025-03-31",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    descriptions = [item["description"] for item in data["items"]]
    assert "March tx" in descriptions
    assert "April tx" not in descriptions


def test_update_transaction(client: TestClient, auth_headers: dict):
    cat_id = _create_category(client, auth_headers, "Update TX Cat")
    create_response = client.post(
        "/api/v1/transactions/",
        json={
            "category_id": cat_id,
            "amount": 50.0,
            "original_amount": 50.0,
            "original_currency": "USD",
            "date": "2025-05-01",
            "description": "Original description",
            "type": "expense",
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    tx_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/v1/transactions/{tx_id}",
        json={"amount": 75.0, "description": "Updated description"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["amount"] == 75.0
    assert data["description"] == "Updated description"
    assert data["type"] == "expense"  # unchanged


def test_delete_transaction(client: TestClient, auth_headers: dict):
    cat_id = _create_category(client, auth_headers, "Delete TX Cat")
    create_response = client.post(
        "/api/v1/transactions/",
        json={
            "category_id": cat_id,
            "amount": 30.0,
            "original_amount": 30.0,
            "original_currency": "USD",
            "date": "2025-06-01",
            "description": "To be deleted",
            "type": "expense",
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    tx_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/transactions/{tx_id}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    # Verify it's gone
    get_response = client.get("/api/v1/transactions/", headers=auth_headers)
    ids = [item["id"] for item in get_response.json()["items"]]
    assert tx_id not in ids
