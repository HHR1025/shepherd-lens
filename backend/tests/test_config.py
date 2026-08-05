import pytest
from fastapi.testclient import TestClient

from shepherd_lens_api.app import create_app
from shepherd_lens_api.config import Settings, validate_origins


def test_wildcard_cors_origin_is_rejected():
    with pytest.raises(ValueError, match="Wildcard"):
        validate_origins(("*",))


def test_configured_origin_receives_bounded_cors_headers():
    client = TestClient(
        create_app(
            Settings(cors_allowed_origins=("chrome-extension://example-extension",))
        )
    )

    response = client.options(
        "/v1/analyze-feed",
        headers={
            "Origin": "chrome-extension://example-extension",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == (
        "chrome-extension://example-extension"
    )
    assert response.headers.get("access-control-allow-credentials") is None


def test_unconfigured_origin_is_not_allowed():
    client = TestClient(create_app())

    response = client.options(
        "/v1/analyze-feed",
        headers={
            "Origin": "https://unconfigured.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert "access-control-allow-origin" not in response.headers
