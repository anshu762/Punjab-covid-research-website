"""Tests for compute API endpoints."""

import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.settings import settings

client = TestClient(app)


def test_public_upload_requires_token():
    res = client.post("/public/datasets/upload")
    assert res.status_code == 401


def test_public_upload_invalid_token():
    res = client.post(
        "/public/datasets/upload",
        headers={"Authorization": "Bearer bad-token"},
    )
    assert res.status_code == 401


def test_public_upload_wrong_scope():
    token = jwt.encode(
        {"sub": "user_123", "scope": "other:scope"},
        settings.COMPUTE_SHARED_SECRET,
        algorithm="HS256",
    )
    res = client.post(
        "/public/datasets/upload",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_internal_endpoints_require_secret():
    res = client.post("/internal/datasets/import-bundled", json={"user_id": "u1", "source_key": "k"})
    assert res.status_code == 403

    res2 = client.post("/internal/datasets/fetch-archive", json={"user_id": "u1"})
    assert res2.status_code == 403
