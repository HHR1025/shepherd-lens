# Shepherd Lens API

This optional FastAPI service provides a versioned boundary for deterministic
interpretation of measurements already calculated by Shepherd Lens clients and bounded
public-source discovery for one explicit query.

It does not scrape platforms, collect feeds, call a model, determine truth, or persist
requests. Public retrieval returns navigation links, not verification. The Chrome extension
remains fully functional without this service and does not currently call it.

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
POST /v1/evidence/search
```

`POST /v1/analyze-feed` accepts normalized visible feed items, measured attention and
structure signals, optional compact history context, and optional evidence references.
It returns deterministic interpretations whose `basis` values point back to supplied
measurement identifiers.

`POST /v1/evidence/search` accepts a schema version, one whitespace-normalized query of
at most 180 characters, and an English or Chinese language selector. It queries keyless
Crossref and English or Chinese Wikipedia endpoints concurrently. The response contains
normalized links, per-provider success, empty, timeout, or error states, bounded elapsed
times, and a process-local cache status.

A discovered link is not proof that a claim is supported. An empty result does not mean
that no evidence exists. GDELT backend retrieval remains deferred while the extension's
existing GDELT integration is evaluated separately.

## Offline Retrieval Evaluation

The backend includes a versioned bilingual engineering baseline for normalized evidence
results. It validates candidate identifiers, safe and unique URLs, provider result counts,
ordinal relevance judgments, expected categories, and expected provider states before
scoring. The deterministic report contains precision at k, nDCG at k, reciprocal rank,
category accuracy, provider-status consistency, and English, Chinese, Crossref, and
Wikipedia slices.

Run the baseline and emit JSON:

```bash
python -m shepherd_lens_api.evidence_evaluation_cli --k 3
```

The static corpus is intentionally independent from live network responses so it can run
in CI. It is an engineering regression fixture, not independently labeled ground truth.
It does not measure live provider coverage, freshness, or population-level relevance and
must not be used as an Evidence Confidence Index or truth score.

## Evidence Retrieval Controls

Defaults can be changed only within enforced bounds:

```powershell
$env:SHEPHERD_LENS_EVIDENCE_TIMEOUT_SECONDS="8"
$env:SHEPHERD_LENS_EVIDENCE_CACHE_TTL_SECONDS="300"
$env:SHEPHERD_LENS_EVIDENCE_CACHE_CAPACITY="128"
```

The timeout must be between 0.1 and 30 seconds, cache TTL between 1 and 3600 seconds,
and cache capacity between 1 and 1000 entries. Cache keys contain only normalized query
and language values. Complete provider failures are not cached. The service does not log
query bodies or provider response bodies.

## CORS

CORS is disabled by default. Configure explicit origins only when a client integration
is intentionally enabled:

```powershell
$env:SHEPHERD_LENS_CORS_ORIGINS="chrome-extension://your-extension-id"
```

Comma-separated HTTP, HTTPS, and Chrome Extension origins are accepted. Wildcard origins
and credentials are not supported.

## Boundaries

The service has no database, authentication, model inference, or cloud deployment
configuration. Its cache and provider controls are process-local development safeguards,
not production-grade distributed rate limiting or shared caching. Production deployment
would additionally require transport security, an upstream request-size limit, distributed
rate limiting, structured operational monitoring, and an explicit privacy policy.
