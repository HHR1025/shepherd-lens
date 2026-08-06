import asyncio

import httpx
import pytest

from shepherd_lens_api.evidence_adapters import (
    CrossrefRetrievalAdapter,
    EvidenceProviderError,
    WikipediaRetrievalAdapter,
)


def run(coroutine):
    return asyncio.run(coroutine)


def test_crossref_normalizes_bounded_research_results():
    observed_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal observed_request
        observed_request = request
        return httpx.Response(
            200,
            json={
                "message": {
                    "items": [
                        {
                            "title": ["Air quality research"],
                            "URL": "https://doi.org/10.1000/example#section",
                            "publisher": "Example Press",
                        },
                        {
                            "title": ["Unsafe"],
                            "URL": "javascript:alert(1)",
                        },
                    ]
                }
            },
        )

    async def scenario():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await CrossrefRetrievalAdapter(client).search("air quality", "en")

    results = run(scenario())

    assert observed_request is not None
    assert observed_request.url.host == "api.crossref.org"
    assert observed_request.url.params["query.bibliographic"] == "air quality"
    assert observed_request.url.params["rows"] == "3"
    assert observed_request.headers["user-agent"].startswith("Shepherd-Lens/")
    assert [result.model_dump(mode="json") for result in results] == [
        {
            "title": "Air quality research",
            "url": "https://doi.org/10.1000/example",
            "provider": "crossref",
            "category": "research",
            "source_name": "Example Press",
        }
    ]


def test_wikipedia_uses_the_selected_language_and_normalizes_results():
    observed_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal observed_request
        observed_request = request
        return httpx.Response(
            200,
            json={
                "query": {
                    "search": [
                        {"pageid": 42, "title": "空气质量"},
                        {"pageid": "not-an-integer", "title": "Invalid"},
                    ]
                }
            },
        )

    async def scenario():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await WikipediaRetrievalAdapter(client).search("空气质量", "zh")

    results = run(scenario())

    assert observed_request is not None
    assert observed_request.url.host == "zh.wikipedia.org"
    assert observed_request.url.params["srsearch"] == "空气质量"
    assert results[0].title == "空气质量"
    assert str(results[0].url) == "https://zh.wikipedia.org/?curid=42"
    assert results[0].category == "reference"


def test_malformed_provider_payload_is_rejected():
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected": []})

    async def scenario():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await CrossrefRetrievalAdapter(client).search("air quality", "en")

    with pytest.raises(EvidenceProviderError, match="Crossref"):
        run(scenario())


def test_provider_http_errors_are_rejected_without_response_body_leakage():
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="private upstream detail")

    async def scenario():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await WikipediaRetrievalAdapter(client).search("air quality", "en")

    with pytest.raises(EvidenceProviderError, match="Wikipedia") as error:
        run(scenario())

    assert "private upstream detail" not in str(error.value)


def test_provider_timeouts_have_a_distinct_error_type():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow upstream", request=request)

    async def scenario():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await CrossrefRetrievalAdapter(client).search("air quality", "en")

    from shepherd_lens_api.evidence_adapters import EvidenceProviderTimeout

    with pytest.raises(EvidenceProviderTimeout, match="timed out"):
        run(scenario())
