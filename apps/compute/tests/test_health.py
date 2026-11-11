"""Health check endpoint tests."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health() -> None:
    """GET /health returns 200 and ok=True."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
