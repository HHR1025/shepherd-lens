from typing import Annotated, Literal

from pydantic import (
    AnyHttpUrl,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

API_SCHEMA_VERSION = 1
MAX_FEED_ITEMS = 50
MAX_MEASUREMENTS = 20
MAX_EVIDENCE_REFERENCES = 20
MAX_EVIDENCE_QUERY_LENGTH = 180

Language = Literal["en", "zh"]
MeasureLevel = Literal["low", "moderate", "high"]
PageType = Literal["home", "watch", "search", "shorts", "other"]
EvidenceCategory = Literal["primary", "research", "reporting", "reference"]
EvidenceProvider = Literal["crossref", "wikipedia"]
EvidenceProviderStatus = Literal["success", "empty", "timeout", "error"]
CacheStatus = Literal["hit", "miss"]
InterpretationLabel = Literal[
    "unknown",
    "calm",
    "moderate",
    "elevated",
    "low",
    "high",
    "unavailable",
    "steady",
    "increasing",
    "decreasing",
    "mixed",
]
ObservationCode = Literal[
    "attention_climate",
    "feed_diversity",
    "local_drift",
    "evidence_available",
]
UncertaintyCode = Literal[
    "small_visible_sample",
    "missing_attention_signals",
    "missing_structure_metrics",
    "missing_history_context",
    "no_evidence_references",
]
EvidenceText = Annotated[str, Field(min_length=1, max_length=300)]
BasisReference = Annotated[
    str,
    Field(pattern=r"^(?:(?:attention|structure):[a-z][a-z0-9_]{0,63}|evidence:\d{1,2})$"),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class FeedItem(StrictModel):
    title: str = Field(min_length=1, max_length=300)
    channel: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=1_000)
    duration: str = Field(default="", max_length=32)
    url: AnyHttpUrl | None = None


class MeasuredSignal(StrictModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    label: str = Field(min_length=1, max_length=100)
    value: float = Field(ge=0, le=100)
    level: MeasureLevel
    evidence: list[EvidenceText] = Field(default_factory=list, max_length=5)

    @model_validator(mode="after")
    def level_matches_value(self) -> "MeasuredSignal":
        expected = level_for_value(self.value)
        if self.level != expected:
            raise ValueError(
                f"level must be {expected!r} for measurement value {self.value}"
            )
        return self


class ObservationContext(StrictModel):
    page_type: PageType
    observed_at: AwareDatetime


class HistoryContext(StrictModel):
    snapshot_count: int = Field(ge=1, le=100)
    last_observed_at: AwareDatetime
    previous_attention_signals: list[MeasuredSignal] = Field(
        default_factory=list,
        max_length=MAX_MEASUREMENTS,
    )
    previous_structure_metrics: list[MeasuredSignal] = Field(
        default_factory=list,
        max_length=MAX_MEASUREMENTS,
    )

    @model_validator(mode="after")
    def historical_measurement_ids_are_unique(self) -> "HistoryContext":
        ensure_unique_ids(
            self.previous_attention_signals,
            "previous_attention_signals",
        )
        ensure_unique_ids(
            self.previous_structure_metrics,
            "previous_structure_metrics",
        )
        return self


class EvidenceReference(StrictModel):
    title: str = Field(min_length=1, max_length=300)
    url: AnyHttpUrl
    provider: str = Field(min_length=1, max_length=80)
    category: EvidenceCategory
    source_name: str = Field(min_length=1, max_length=200)


class EvidenceSearchRequest(StrictModel):
    schema_version: Literal[1]
    language: Language
    query: str = Field(min_length=1, max_length=MAX_EVIDENCE_QUERY_LENGTH)

    @field_validator("query")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("query must contain visible text")
        return normalized


class ProviderObservation(StrictModel):
    provider: EvidenceProvider
    status: EvidenceProviderStatus
    result_count: int = Field(ge=0, le=MAX_EVIDENCE_REFERENCES)
    elapsed_ms: int = Field(ge=0, le=60_000)


class EvidenceSearchResponse(StrictModel):
    schema_version: Literal[1]
    query: str = Field(min_length=1, max_length=MAX_EVIDENCE_QUERY_LENGTH)
    language: Language
    cache_status: CacheStatus
    providers: list[ProviderObservation] = Field(min_length=1, max_length=5)
    sources: list[EvidenceReference] = Field(max_length=MAX_EVIDENCE_REFERENCES)
    limitations: list[str] = Field(min_length=2, max_length=5)


class AnalyzeFeedRequest(StrictModel):
    schema_version: Literal[1]
    language: Language
    feed_items: list[FeedItem] = Field(min_length=1, max_length=MAX_FEED_ITEMS)
    attention_signals: list[MeasuredSignal] = Field(
        default_factory=list,
        max_length=MAX_MEASUREMENTS,
    )
    structure_metrics: list[MeasuredSignal] = Field(
        default_factory=list,
        max_length=MAX_MEASUREMENTS,
    )
    context: ObservationContext
    history: HistoryContext | None = None
    evidence_references: list[EvidenceReference] = Field(
        default_factory=list,
        max_length=MAX_EVIDENCE_REFERENCES,
    )

    @model_validator(mode="after")
    def measurement_ids_are_unique(self) -> "AnalyzeFeedRequest":
        ensure_unique_ids(self.attention_signals, "attention_signals")
        ensure_unique_ids(self.structure_metrics, "structure_metrics")
        return self


class Interpretation(StrictModel):
    label: InterpretationLabel
    value: float | None
    basis: list[BasisReference]


class AnalysisObservation(StrictModel):
    code: ObservationCode
    message: str
    basis: list[BasisReference] = Field(min_length=1)


class Uncertainty(StrictModel):
    observation_boundary: Literal["weak_signal", "page_snapshot", "session_trend"]
    codes: list[UncertaintyCode]
    notes: list[str]


class InputSummary(StrictModel):
    feed_item_count: int
    attention_signal_count: int
    structure_metric_count: int
    evidence_reference_count: int
    page_type: PageType


class AnalyzeFeedResponse(StrictModel):
    analysis_version: Literal[1]
    mode: Literal["deterministic"]
    attention_climate: Interpretation
    feed_diversity: Interpretation
    drift: Interpretation
    observations: list[AnalysisObservation]
    uncertainty: Uncertainty
    evidence_references: list[EvidenceReference]
    input_summary: InputSummary


class HealthResponse(StrictModel):
    status: Literal["healthy"]
    service: Literal["shepherd-lens-api"]
    api_version: Literal[1]


def level_for_value(value: float) -> MeasureLevel:
    if value >= 67:
        return "high"
    if value >= 34:
        return "moderate"
    return "low"


def ensure_unique_ids(values: list[MeasuredSignal], field_name: str) -> None:
    identifiers = [value.id for value in values]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError(f"{field_name} must not contain duplicate ids")
