from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_create_category(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/v1/categories/",
        json={"name": "Groceries", "icon": "🛒", "color": "#ff0000", "type": "expense"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Groceries"
    assert data["icon"] == "🛒"
    assert data["color"] == "#ff0000"
    assert data["type"] == "expense"
    assert "id" in data
    assert "user_id" in data


def test_get_categories(client: TestClient, auth_headers: dict):
    # Create a category first
    client.post(
        "/api/v1/categories/",
        json={"name": "My Test Category", "icon": "📦", "color": "#00ff00", "type": "income"},
        headers=auth_headers,
    )
    response = client.get("/api/v1/categories/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # All categories belong to the current user
    names = [c["name"] for c in data]
    assert "My Test Category" in names


def test_update_category(client: TestClient, auth_headers: dict):
    # Create
    create_response = client.post(
        "/api/v1/categories/",
        json={"name": "To Update", "icon": "📝", "color": "#0000ff", "type": "expense"},
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    cat_id = create_response.json()["id"]

    # Update
    response = client.put(
        f"/api/v1/categories/{cat_id}",
        json={"name": "Updated Name", "color": "#123456"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["color"] == "#123456"
    assert data["icon"] == "📝"  # unchanged


def test_delete_category(client: TestClient, auth_headers: dict):
    # Create
    create_response = client.post(
        "/api/v1/categories/",
        json={"name": "To Delete", "icon": "🗑️", "color": "#ff00ff", "type": "expense"},
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    cat_id = create_response.json()["id"]

    # Delete
    response = client.delete(f"/api/v1/categories/{cat_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"ok": True}

    # Verify gone - get all and check
    get_response = client.get("/api/v1/categories/", headers=auth_headers)
    ids = [c["id"] for c in get_response.json()]
    assert cat_id not in ids
