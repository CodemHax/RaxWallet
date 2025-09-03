import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_endpoint():
    """Test that the root endpoint returns the index page."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

def test_openapi_docs():
    """Test that API documentation is accessible."""
    response = client.get("/docs")
    assert response.status_code == 200

def test_app_startup():
    """Test that the app can start without errors."""
    # This test simply verifies the app instance is properly configured
    assert app is not None
    assert hasattr(app, 'router')