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


def test_evidence_operational_settings_are_loaded_from_bounded_environment(monkeypatch):
    monkeypatch.setenv("SHEPHERD_LENS_EVIDENCE_TIMEOUT_SECONDS", "4.5")
    monkeypatch.setenv("SHEPHERD_LENS_EVIDENCE_CACHE_TTL_SECONDS", "120")
    monkeypatch.setenv("SHEPHERD_LENS_EVIDENCE_CACHE_CAPACITY", "32")

    settings = Settings.from_env()

    assert settings.evidence_provider_timeout_seconds == 4.5
    assert settings.evidence_cache_ttl_seconds == 120
    assert settings.evidence_cache_capacity == 32


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("SHEPHERD_LENS_EVIDENCE_TIMEOUT_SECONDS", "0"),
        ("SHEPHERD_LENS_EVIDENCE_TIMEOUT_SECONDS", "31"),
        ("SHEPHERD_LENS_EVIDENCE_CACHE_TTL_SECONDS", "3601"),
        ("SHEPHERD_LENS_EVIDENCE_CACHE_CAPACITY", "1001"),
        ("SHEPHERD_LENS_EVIDENCE_CACHE_CAPACITY", "not-a-number"),
    ],
)
def test_invalid_evidence_operational_settings_are_rejected(monkeypatch, name, value):
    monkeypatch.setenv(name, value)

    with pytest.raises(ValueError, match=name):
        Settings.from_env()
