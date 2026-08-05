from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .analysis import analyze_feed
from .config import Settings
from .models import (
    API_SCHEMA_VERSION,
    AnalyzeFeedRequest,
    AnalyzeFeedResponse,
    HealthResponse,
)


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or Settings.from_env()
    application = FastAPI(
        title="Shepherd Lens API",
        version="0.1.0",
        description="Optional deterministic analysis boundary for Shepherd Lens.",
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

    return application


app = create_app()
