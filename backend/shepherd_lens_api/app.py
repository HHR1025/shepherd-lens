from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .analysis import analyze_feed
from .config import Settings
from .evidence import (
    EvidenceResultCache,
    EvidenceRetrievalService,
    EvidenceSearchService,
)
from .evidence_adapters import CrossrefRetrievalAdapter, WikipediaRetrievalAdapter
from .models import (
    API_SCHEMA_VERSION,
    AnalyzeFeedRequest,
    AnalyzeFeedResponse,
    EvidenceSearchRequest,
    EvidenceSearchResponse,
    HealthResponse,
)


def create_app(
    settings: Settings | None = None,
    evidence_service: EvidenceSearchService | None = None,
) -> FastAPI:
    resolved_settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        if evidence_service is not None:
            application.state.evidence_service = evidence_service
            yield
            return

        async with httpx.AsyncClient() as client:
            application.state.evidence_service = EvidenceRetrievalService(
                [
                    CrossrefRetrievalAdapter(
                        client,
                        resolved_settings.evidence_provider_timeout_seconds,
                    ),
                    WikipediaRetrievalAdapter(
                        client,
                        resolved_settings.evidence_provider_timeout_seconds,
                    ),
                ],
                EvidenceResultCache(
                    ttl_seconds=resolved_settings.evidence_cache_ttl_seconds,
                    capacity=resolved_settings.evidence_cache_capacity,
                ),
            )
            yield

    application = FastAPI(
        title="Shepherd Lens API",
        version="0.1.0",
        description="Optional deterministic analysis boundary for Shepherd Lens.",
        lifespan=lifespan,
    )

    if resolved_settings.cors_allowed_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=list(resolved_settings.cors_allowed_origins),
            allow_credentials=False,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
        )

    @application.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(
            status="healthy",
            service="shepherd-lens-api",
            api_version=API_SCHEMA_VERSION,
        )

    @application.post("/v1/analyze-feed", response_model=AnalyzeFeedResponse)
    async def analyze(request: AnalyzeFeedRequest) -> AnalyzeFeedResponse:
        return analyze_feed(request)

    @application.post("/v1/evidence/search", response_model=EvidenceSearchResponse)
    async def search_evidence(request: EvidenceSearchRequest) -> EvidenceSearchResponse:
        service = evidence_service or application.state.evidence_service
        return await service.search(request)

    return application


app = create_app()
