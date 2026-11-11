"""Health check endpoint tests."""
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health() -> None:
    """GET /health returns 200 and ok=True."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
