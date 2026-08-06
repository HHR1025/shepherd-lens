from fastapi.testclient import TestClient

from shepherd_lens_api.app import create_app
from shepherd_lens_api.models import (
    EvidenceSearchRequest,
    EvidenceSearchResponse,
    ProviderObservation,
)


class StubEvidenceService:
    def __init__(self) -> None:
        self.requests: list[EvidenceSearchRequest] = []

    async def search(self, request: EvidenceSearchRequest) -> EvidenceSearchResponse:
        self.requests.append(request)
        return EvidenceSearchResponse(
            schema_version=1,
            query=request.query,
            language=request.language,
            cache_status="miss",
            providers=[
                ProviderObservation(
                    provider="crossref",
                    status="empty",
                    result_count=0,
                    elapsed_ms=2,
                )
            ],
            sources=[],
            limitations=[
                "Discovery links are not verification or truth judgments.",
                "No result does not mean that no evidence exists.",
            ],
        )


def test_versioned_evidence_endpoint_accepts_only_bounded_query_context():
    service = StubEvidenceService()
    client = TestClient(create_app(evidence_service=service))

    response = client.post(
        "/v1/evidence/search",
        json={"schema_version": 1, "language": "zh", "query": "  空气   质量  "},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "空气 质量"
    assert body["language"] == "zh"
    assert body["providers"][0]["status"] == "empty"
    assert service.requests[0].query == "空气 质量"


def test_evidence_endpoint_rejects_extra_or_oversized_input():
    client = TestClient(create_app(evidence_service=StubEvidenceService()))

    extra = client.post(
        "/v1/evidence/search",
        json={
            "schema_version": 1,
            "language": "en",
            "query": "air quality",
            "feed_history": ["must not be accepted"],
        },
    )
    oversized = client.post(
        "/v1/evidence/search",
        json={"schema_version": 1, "language": "en", "query": "x" * 181},
    )

    assert extra.status_code == 422
    assert oversized.status_code == 422
