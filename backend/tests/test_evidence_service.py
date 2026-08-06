import asyncio
import logging
from collections.abc import Sequence

from shepherd_lens_api.evidence import (
    EvidenceProviderError,
    EvidenceProviderTimeout,
    EvidenceResultCache,
    EvidenceRetrievalService,
)
from shepherd_lens_api.models import (
    EvidenceReference,
    EvidenceSearchRequest,
    Language,
)


class MutableClock:
    def __init__(self) -> None:
        self.value = 10.0

    def __call__(self) -> float:
        return self.value


class StubAdapter:
    def __init__(
        self,
        provider: str,
        results: Sequence[EvidenceReference] = (),
        error: Exception | None = None,
    ) -> None:
        self.provider = provider
        self.results = results
        self.error = error
        self.calls = 0

    async def search(self, query: str, language: Language):
        self.calls += 1
        if self.error:
            raise self.error
        return self.results


def reference(url: str, provider: str = "crossref") -> EvidenceReference:
    return EvidenceReference(
        title="Evidence title",
        url=url,
        provider=provider,
        category="research" if provider == "crossref" else "reference",
        source_name="Evidence source",
    )


def request(query: str = "  Air   quality  ", language: Language = "en"):
    return EvidenceSearchRequest(schema_version=1, query=query, language=language)


def run(coroutine):
    return asyncio.run(coroutine)


def test_search_normalizes_query_deduplicates_and_isolates_provider_failure():
    clock = MutableClock()
    crossref = StubAdapter(
        "crossref",
        [
            reference("https://doi.org/10.1000/example"),
            reference("https://doi.org/10.1000/example"),
        ],
    )
    wikipedia = StubAdapter("wikipedia", error=EvidenceProviderError("offline"))
    service = EvidenceRetrievalService(
        [crossref, wikipedia],
        EvidenceResultCache(ttl_seconds=60, capacity=4, clock=clock),
        clock=clock,
    )

    result = run(service.search(request()))

    assert result.query == "Air quality"
    assert result.cache_status == "miss"
    assert [provider.status for provider in result.providers] == ["success", "error"]
    assert len(result.sources) == 1
    assert crossref.calls == wikipedia.calls == 1
    assert all(provider.elapsed_ms == 0 for provider in result.providers)


def test_timeout_is_distinct_from_other_provider_errors():
    service = EvidenceRetrievalService(
        [
            StubAdapter("crossref", error=EvidenceProviderTimeout("slow")),
            StubAdapter("wikipedia"),
        ],
        EvidenceResultCache(ttl_seconds=60, capacity=2),
    )

    result = run(service.search(request()))

    assert [provider.status for provider in result.providers] == ["timeout", "empty"]


def test_cache_hits_expire_and_use_normalized_deterministic_keys():
    clock = MutableClock()
    adapter = StubAdapter("crossref", [reference("https://doi.org/10.1000/example")])
    service = EvidenceRetrievalService(
        [adapter],
        EvidenceResultCache(ttl_seconds=5, capacity=2, clock=clock),
        clock=clock,
    )

    first = run(service.search(request("Air quality")))
    cached = run(service.search(request(" air   QUALITY ")))
    clock.value += 6
    expired = run(service.search(request("Air quality")))

    assert first.cache_status == "miss"
    assert cached.cache_status == "hit"
    assert expired.cache_status == "miss"
    assert adapter.calls == 2
    assert cached.providers[0].elapsed_ms == 0


def test_cache_capacity_evicts_the_least_recently_used_entry():
    clock = MutableClock()
    adapter = StubAdapter("crossref", [reference("https://doi.org/10.1000/example")])
    service = EvidenceRetrievalService(
        [adapter],
        EvidenceResultCache(ttl_seconds=60, capacity=2, clock=clock),
        clock=clock,
    )

    run(service.search(request("one")))
    run(service.search(request("two")))
    run(service.search(request("one")))
    run(service.search(request("three")))
    result = run(service.search(request("two")))

    assert result.cache_status == "miss"
    assert adapter.calls == 4


def test_complete_provider_failure_is_not_cached():
    adapter = StubAdapter("crossref", error=EvidenceProviderError("offline"))
    service = EvidenceRetrievalService(
        [adapter],
        EvidenceResultCache(ttl_seconds=60, capacity=2),
    )

    first = run(service.search(request()))
    second = run(service.search(request()))

    assert first.cache_status == second.cache_status == "miss"
    assert adapter.calls == 2


def test_search_does_not_write_query_contents_to_logs(caplog):
    query = "private user query"
    service = EvidenceRetrievalService(
        [StubAdapter("crossref")],
        EvidenceResultCache(ttl_seconds=60, capacity=2),
    )

    with caplog.at_level(logging.DEBUG):
        run(service.search(request(query)))

    assert query not in caplog.text
