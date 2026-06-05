from __future__ import annotations

import os

# Override DATABASE_URL BEFORE importing app modules so session.py picks up SQLite
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# These imports happen AFTER env override
from app.core.deps import get_db
from app.db.session import Base
from app.main import app

# Use file-based SQLite for tests (avoids in-memory thread issues)
TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    # Clean up test db file
    if os.path.exists("./test.db"):
        os.remove("./test.db")


@pytest.fixture()
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def test_user(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "testuser@example.com", "name": "Test User", "password": "testpassword"},
    )
    # Accept 201 or 400 (already registered in same session)
    if response.status_code == 400:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "testuser@example.com", "password": "testpassword"},
        )
    data = response.json()
    return data


@pytest.fixture()
def auth_headers(test_user: dict) -> dict:
    token = test_user["access_token"]
    return {"Authorization": f"Bearer {token}"}
