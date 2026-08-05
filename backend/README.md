# Shepherd Lens API

This optional FastAPI service provides a versioned boundary for deterministic
interpretation of measurements already calculated by Shepherd Lens clients.

It does not scrape platforms, collect feeds, call a model, determine truth, or persist
requests. The Chrome extension remains fully functional without this service.

## Local Setup

Requires Python 3.11 or newer.

```bash
cd backend
python -m pip install -e ".[dev]"
python -m ruff check .
python -m pytest
python -m uvicorn shepherd_lens_api.app:app --reload
```

The API is then available at `http://127.0.0.1:8000` and its generated OpenAPI
documentation is available at `http://127.0.0.1:8000/docs`.

## Endpoints

```text
GET  /health
POST /v1/analyze-feed
```

`POST /v1/analyze-feed` accepts normalized visible feed items, measured attention and
structure signals, optional compact history context, and optional evidence references.
It returns deterministic interpretations whose `basis` values point back to supplied
measurement identifiers.

## CORS

CORS is disabled by default. Configure explicit origins only when a client integration
is intentionally enabled:

```powershell
$env:SHEPHERD_LENS_CORS_ORIGINS="chrome-extension://your-extension-id"
```

Comma-separated HTTP, HTTPS, and Chrome Extension origins are accepted. Wildcard origins
and credentials are not supported.

## Boundaries

The service has no database, authentication, remote retrieval, model inference, or cloud
deployment configuration. Production deployment would additionally require transport
security, an upstream request-size limit, rate limiting, operational monitoring, and an
explicit privacy policy.
