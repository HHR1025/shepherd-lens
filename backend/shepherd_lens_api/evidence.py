import asyncio
import time
from collections import OrderedDict
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Protocol

from .adapters import RetrievalAdapter
from .evidence_adapters import EvidenceProviderError, EvidenceProviderTimeout
from .models import (
    EvidenceProviderStatus,
    EvidenceReference,
    EvidenceSearchRequest,
    EvidenceSearchResponse,
    ProviderObservation,
)

LIMITATIONS = (
    "Discovery links are not verification or truth judgments.",
    "No result does not mean that no evidence exists.",
)


class EvidenceSearchService(Protocol):
    async def search(self, request: EvidenceSearchRequest) -> EvidenceSearchResponse: ...


@dataclass(frozen=True)
class CachedEvidenceResult:
    providers: tuple[ProviderObservation, ...]
    sources: tuple[EvidenceReference, ...]


@dataclass(frozen=True)
class CacheEntry:
    expires_at: float
    value: CachedEvidenceResult


class EvidenceResultCache:
    def __init__(
        self,
        ttl_seconds: float,
        capacity: int,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive")
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self._ttl_seconds = ttl_seconds
        self._capacity = capacity
        self._clock = clock
        self._entries: OrderedDict[str, CacheEntry] = OrderedDict()

    def get(self, key: str) -> CachedEvidenceResult | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        if entry.expires_at <= self._clock():
            del self._entries[key]
            return None
        self._entries.move_to_end(key)
        return entry.value

    def set(self, key: str, value: CachedEvidenceResult) -> None:
        self._entries[key] = CacheEntry(
            expires_at=self._clock() + self._ttl_seconds,
            value=value,
        )
        self._entries.move_to_end(key)
        while len(self._entries) > self._capacity:
            self._entries.popitem(last=False)


class EvidenceRetrievalService:
    def __init__(
        self,
        adapters: Sequence[RetrievalAdapter],
        cache: EvidenceResultCache,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if not adapters:
            raise ValueError("at least one retrieval adapter is required")
        self._adapters = tuple(adapters)
        self._cache = cache
        self._clock = clock

    async def search(self, request: EvidenceSearchRequest) -> EvidenceSearchResponse:
        cache_key = f"{request.language}:{request.query.casefold()}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return self._response(
                request,
                "hit",
                [provider.model_copy(update={"elapsed_ms": 0}) for provider in cached.providers],
                list(cached.sources),
            )

        provider_results = await asyncio.gather(
            *(self._retrieve(adapter, request) for adapter in self._adapters)
        )
        providers = [result[0] for result in provider_results]
        sources = _deduplicate_sources(
            source for _, adapter_sources in provider_results for source in adapter_sources
        )
        if any(provider.status in {"success", "empty"} for provider in providers):
            self._cache.set(
                cache_key,
                CachedEvidenceResult(tuple(providers), tuple(sources)),
            )
        return self._response(request, "miss", providers, sources)

    async def _retrieve(
        self,
        adapter: RetrievalAdapter,
        request: EvidenceSearchRequest,
    ) -> tuple[ProviderObservation, list[EvidenceReference]]:
        started_at = self._clock()
        status: EvidenceProviderStatus
        try:
            sources = list(await adapter.search(request.query, request.language))
            status = "success" if sources else "empty"
        except EvidenceProviderTimeout:
            sources = []
            status = "timeout"
        except Exception:
            sources = []
            status = "error"
        elapsed_ms = min(60_000, max(0, round((self._clock() - started_at) * 1_000)))
        return (
            ProviderObservation(
                provider=adapter.provider,
                status=status,
                result_count=len(sources),
                elapsed_ms=elapsed_ms,
            ),
            sources,
        )

    @staticmethod
    def _response(
        request: EvidenceSearchRequest,
        cache_status: str,
        providers: list[ProviderObservation],
        sources: list[EvidenceReference],
    ) -> EvidenceSearchResponse:
        return EvidenceSearchResponse(
            schema_version=1,
            query=request.query,
            language=request.language,
            cache_status=cache_status,
            providers=providers,
            sources=sources,
            limitations=list(LIMITATIONS),
        )


def _deduplicate_sources(sources) -> list[EvidenceReference]:
    seen: set[str] = set()
    deduplicated: list[EvidenceReference] = []
    for source in sources:
        key = str(source.url).casefold()
        if key in seen:
            continue
        seen.add(key)
        deduplicated.append(source)
    return deduplicated


__all__ = [
    "EvidenceProviderError",
    "EvidenceProviderTimeout",
    "EvidenceResultCache",
    "EvidenceRetrievalService",
    "EvidenceSearchService",
]
