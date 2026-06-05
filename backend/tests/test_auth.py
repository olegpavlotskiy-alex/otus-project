from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_register_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "newuser1@example.com", "name": "New User 1", "password": "securepass123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client: TestClient):
    # Register first time
    client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "name": "Dup User", "password": "pass123"},
    )
    # Try to register again with same email
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "name": "Dup User 2", "password": "pass456"},
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login_success(client: TestClient):
    # Register a user first
    client.post(
        "/api/v1/auth/register",
        json={"email": "logintest@example.com", "name": "Login Test", "password": "mypassword"},
    )
    # Then login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "logintest@example.com", "password": "mypassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={"email": "wrongpass@example.com", "name": "Wrong Pass User", "password": "correctpass"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrongpass"},
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "somepassword"},
    )
    assert response.status_code == 401
