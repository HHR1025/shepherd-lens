from collections.abc import Sequence
from typing import Protocol

from .models import AnalyzeFeedRequest, AnalyzeFeedResponse, EvidenceReference, Language


class RetrievalAdapter(Protocol):
    """Boundary for future public/open evidence retrieval implementations."""

    async def search(self, query: str, language: Language) -> Sequence[EvidenceReference]: ...


class InterpretationAdapter(Protocol):
    """Boundary for optional future open-source or user-configured models."""

    async def analyze(self, request: AnalyzeFeedRequest) -> AnalyzeFeedResponse: ...
