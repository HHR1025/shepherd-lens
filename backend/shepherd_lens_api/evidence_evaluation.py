from __future__ import annotations

import math
from collections import defaultdict
from typing import Annotated, Literal
from urllib.parse import urlsplit, urlunsplit

from pydantic import Field, field_validator, model_validator

from .models import (
    MAX_EVIDENCE_QUERY_LENGTH,
    EvidenceCategory,
    EvidenceProvider,
    EvidenceProviderStatus,
    EvidenceReference,
    Language,
    ProviderObservation,
    StrictModel,
)

EVALUATION_SCHEMA_VERSION = 1
EVALUATION_PROTOCOL_VERSION = "evidence-relevance-v1"
MAX_EVALUATION_CASES = 100
MAX_EVALUATION_CANDIDATES = 20
DEFAULT_EVALUATION_K = 3

EvaluationStatus = Literal["ok", "insufficient_data"]
RelevanceJudgment = Annotated[int, Field(strict=True, ge=0, le=2)]


class EvidenceEvaluationCandidate(StrictModel):
    candidate_id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    reference: EvidenceReference
    relevance: RelevanceJudgment
    expected_category: EvidenceCategory | None = None
    rationale: str = Field(min_length=20, max_length=500)

    @model_validator(mode="after")
    def validate_judgment(self) -> EvidenceEvaluationCandidate:
        if self.reference.provider not in {"crossref", "wikipedia"}:
            raise ValueError("candidate must use a supported evidence provider")
        parsed_url = urlsplit(str(self.reference.url))
        if parsed_url.username is not None or parsed_url.password is not None:
            raise ValueError("candidate URLs must not contain credentials")
        if self.relevance > 0 and self.expected_category is None:
            raise ValueError("relevant candidates require an expected_category")
        return self


class EvaluatedProviderObservation(StrictModel):
    observation: ProviderObservation
    expected_status: EvidenceProviderStatus
    rationale: str = Field(min_length=20, max_length=500)

    @model_validator(mode="after")
    def status_matches_result_shape(self) -> EvaluatedProviderObservation:
        status = self.observation.status
        result_count = self.observation.result_count
        if status == "success" and result_count == 0:
            raise ValueError("successful provider observations require a positive result_count")
        if status != "success" and result_count != 0:
            raise ValueError(f"{status} provider observations require result_count 0")
        return self


class EvidenceEvaluationCase(StrictModel):
    schema_version: Literal[1]
    case_id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    query: str = Field(min_length=1, max_length=MAX_EVIDENCE_QUERY_LENGTH)
    language: Language
    candidates: list[EvidenceEvaluationCandidate] = Field(
        default_factory=list,
        max_length=MAX_EVALUATION_CANDIDATES,
    )
    providers: list[EvaluatedProviderObservation] = Field(min_length=1, max_length=5)
    notes: str = Field(min_length=20, max_length=500)

    @field_validator("query")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("query must contain visible text")
        return normalized

    @model_validator(mode="after")
    def validate_case_consistency(self) -> EvidenceEvaluationCase:
        candidate_ids = [candidate.candidate_id for candidate in self.candidates]
        if len(candidate_ids) != len(set(candidate_ids)):
            raise ValueError("candidate identifiers must be unique within a case")

        candidate_urls = [
            _canonical_url(candidate.reference.url) for candidate in self.candidates
        ]
        if len(candidate_urls) != len(set(candidate_urls)):
            raise ValueError("candidate URLs must be unique within a case")

        provider_names = [entry.observation.provider for entry in self.providers]
        if len(provider_names) != len(set(provider_names)):
            raise ValueError("provider observations must be unique within a case")

        candidate_counts: dict[str, int] = defaultdict(int)
        for candidate in self.candidates:
            candidate_counts[candidate.reference.provider] += 1
            if candidate.reference.provider not in provider_names:
                raise ValueError("each candidate provider requires a provider observation")

        for entry in self.providers:
            provider_name = entry.observation.provider
            if entry.observation.result_count != candidate_counts[provider_name]:
                raise ValueError(
                    f"provider {provider_name!r} result_count must match normalized candidates"
                )
        return self


class EvidenceEvaluationCorpus(StrictModel):
    schema_version: Literal[1]
    protocol_version: Literal["evidence-relevance-v1"]
    cases: list[EvidenceEvaluationCase] = Field(min_length=1, max_length=MAX_EVALUATION_CASES)
    limitations: list[str] = Field(min_length=2, max_length=10)

    @model_validator(mode="after")
    def case_ids_are_unique(self) -> EvidenceEvaluationCorpus:
        case_ids = [case.case_id for case in self.cases]
        if len(case_ids) != len(set(case_ids)):
            raise ValueError("case identifiers must be unique within a corpus")
        return self


class EvaluationMetric(StrictModel):
    status: EvaluationStatus
    value: float | None = Field(default=None, ge=0, le=1)
    sample_size: int = Field(ge=0)
    note: str = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def status_matches_value(self) -> EvaluationMetric:
        if self.status == "ok" and self.value is None:
            raise ValueError("available metrics require a value")
        if self.status == "insufficient_data" and self.value is not None:
            raise ValueError("insufficient-data metrics must not contain a value")
        return self


class EvaluationMetricSet(StrictModel):
    precision_at_k: EvaluationMetric
    ndcg_at_k: EvaluationMetric
    reciprocal_rank: EvaluationMetric
    category_accuracy: EvaluationMetric
    provider_status_consistency: EvaluationMetric


class EvaluationValidationSummary(StrictModel):
    candidate_count: int = Field(ge=0)
    safe_url_count: int = Field(ge=0)
    unique_url_count: int = Field(ge=0)
    duplicate_url_count: int = Field(ge=0)


class EvidenceEvaluationCaseReport(StrictModel):
    case_id: str
    language: Language
    query: str
    metrics: EvaluationMetricSet
    validation: EvaluationValidationSummary


class EvidenceEvaluationAggregate(StrictModel):
    case_count: int = Field(ge=0)
    candidate_count: int = Field(ge=0)
    metrics: EvaluationMetricSet
    validation: EvaluationValidationSummary


class LanguageEvaluationSlice(StrictModel):
    language: Language
    aggregate: EvidenceEvaluationAggregate


class ProviderEvaluationSlice(StrictModel):
    provider: EvidenceProvider
    case_count: int = Field(ge=0)
    candidate_count: int = Field(ge=0)
    category_accuracy: EvaluationMetric
    status_consistency: EvaluationMetric


class EvidenceEvaluationReport(StrictModel):
    schema_version: Literal[1]
    protocol_version: Literal["evidence-relevance-v1"]
    k: int = Field(ge=1, le=MAX_EVALUATION_CANDIDATES)
    aggregate: EvidenceEvaluationAggregate
    cases: list[EvidenceEvaluationCaseReport]
    language_slices: list[LanguageEvaluationSlice]
    provider_slices: list[ProviderEvaluationSlice]
    limitations: list[str]


def evaluate_evidence_corpus(
    corpus: EvidenceEvaluationCorpus,
    k: int = DEFAULT_EVALUATION_K,
) -> EvidenceEvaluationReport:
    if not 1 <= k <= MAX_EVALUATION_CANDIDATES:
        raise ValueError(f"k must be between 1 and {MAX_EVALUATION_CANDIDATES}")

    case_reports = [_evaluate_case(case, k) for case in corpus.cases]
    language_slices = [
        LanguageEvaluationSlice(
            language=language,
            aggregate=_aggregate_cases(
                [
                    report
                    for report in case_reports
                    if report.language == language
                ]
            ),
        )
        for language in ("en", "zh")
        if any(report.language == language for report in case_reports)
    ]
    provider_slices = [
        _provider_slice(corpus.cases, provider)
        for provider in ("crossref", "wikipedia")
        if any(
            entry.observation.provider == provider
            for case in corpus.cases
            for entry in case.providers
        )
    ]
    return EvidenceEvaluationReport(
        schema_version=EVALUATION_SCHEMA_VERSION,
        protocol_version=corpus.protocol_version,
        k=k,
        aggregate=_aggregate_cases(case_reports),
        cases=case_reports,
        language_slices=language_slices,
        provider_slices=provider_slices,
        limitations=list(corpus.limitations),
    )


def _evaluate_case(case: EvidenceEvaluationCase, k: int) -> EvidenceEvaluationCaseReport:
    candidates = case.candidates
    top_candidates = candidates[:k]
    if top_candidates:
        precision = _available_metric(
            sum(candidate.relevance > 0 for candidate in top_candidates)
            / len(top_candidates),
            len(top_candidates),
            "Fraction of returned candidates at k judged at least partially relevant.",
        )
        first_relevant_rank = next(
            (
                index
                for index, candidate in enumerate(candidates, start=1)
                if candidate.relevance > 0
            ),
            None,
        )
        reciprocal_rank = _available_metric(
            0 if first_relevant_rank is None else 1 / first_relevant_rank,
            len(candidates),
            "Reciprocal rank of the first candidate judged relevant.",
        )
    else:
        precision = _insufficient_metric("No candidates were available at k.")
        reciprocal_rank = _insufficient_metric("No ranked candidates were available.")

    ideal_dcg = _discounted_gain(
        sorted((candidate.relevance for candidate in candidates), reverse=True)[:k]
    )
    if not top_candidates or ideal_dcg == 0:
        ndcg = _insufficient_metric("No positively judged candidate defines an ideal ranking.")
    else:
        ndcg = _available_metric(
            _discounted_gain([candidate.relevance for candidate in top_candidates])
            / ideal_dcg,
            len(top_candidates),
            "Graded ranking quality at k using relevance levels zero through two.",
        )

    categorized = [
        candidate
        for candidate in candidates
        if candidate.relevance > 0 and candidate.expected_category is not None
    ]
    if categorized:
        category_accuracy = _available_metric(
            sum(
                candidate.reference.category == candidate.expected_category
                for candidate in categorized
            )
            / len(categorized),
            len(categorized),
            "Agreement between normalized and expected categories for relevant candidates.",
        )
    else:
        category_accuracy = _insufficient_metric(
            "No relevant candidate had an expected category judgment."
        )

    provider_status_consistency = _available_metric(
        sum(
            entry.observation.status == entry.expected_status
            for entry in case.providers
        )
        / len(case.providers),
        len(case.providers),
        "Agreement between observed and expected provider states.",
    )

    return EvidenceEvaluationCaseReport(
        case_id=case.case_id,
        language=case.language,
        query=case.query,
        metrics=EvaluationMetricSet(
            precision_at_k=precision,
            ndcg_at_k=ndcg,
            reciprocal_rank=reciprocal_rank,
            category_accuracy=category_accuracy,
            provider_status_consistency=provider_status_consistency,
        ),
        validation=_validation_summary(candidates),
    )


def _aggregate_cases(
    reports: list[EvidenceEvaluationCaseReport],
) -> EvidenceEvaluationAggregate:
    candidate_count = sum(report.validation.candidate_count for report in reports)
    return EvidenceEvaluationAggregate(
        case_count=len(reports),
        candidate_count=candidate_count,
        metrics=EvaluationMetricSet(
            precision_at_k=_mean_metric(reports, "precision_at_k"),
            ndcg_at_k=_mean_metric(reports, "ndcg_at_k"),
            reciprocal_rank=_mean_metric(reports, "reciprocal_rank"),
            category_accuracy=_mean_metric(reports, "category_accuracy"),
            provider_status_consistency=_mean_metric(
                reports,
                "provider_status_consistency",
            ),
        ),
        validation=EvaluationValidationSummary(
            candidate_count=candidate_count,
            safe_url_count=sum(report.validation.safe_url_count for report in reports),
            unique_url_count=sum(report.validation.unique_url_count for report in reports),
            duplicate_url_count=sum(
                report.validation.duplicate_url_count for report in reports
            ),
        ),
    )


def _provider_slice(
    cases: list[EvidenceEvaluationCase],
    provider: EvidenceProvider,
) -> ProviderEvaluationSlice:
    provider_entries = [
        entry
        for case in cases
        for entry in case.providers
        if entry.observation.provider == provider
    ]
    candidates = [
        candidate
        for case in cases
        for candidate in case.candidates
        if candidate.reference.provider == provider
    ]
    categorized = [
        candidate
        for candidate in candidates
        if candidate.relevance > 0 and candidate.expected_category is not None
    ]
    category_metric = (
        _available_metric(
            sum(
                candidate.reference.category == candidate.expected_category
                for candidate in categorized
            )
            / len(categorized),
            len(categorized),
            "Category agreement for this provider's relevant candidates.",
        )
        if categorized
        else _insufficient_metric("No categorized relevant candidates for this provider.")
    )
    return ProviderEvaluationSlice(
        provider=provider,
        case_count=len(provider_entries),
        candidate_count=len(candidates),
        category_accuracy=category_metric,
        status_consistency=_available_metric(
            sum(
                entry.observation.status == entry.expected_status
                for entry in provider_entries
            )
            / len(provider_entries),
            len(provider_entries),
            "Observed provider-state agreement for this provider.",
        ),
    )


def _mean_metric(
    reports: list[EvidenceEvaluationCaseReport],
    metric_name: str,
) -> EvaluationMetric:
    available = [
        metric
        for report in reports
        if (metric := getattr(report.metrics, metric_name)).status == "ok"
    ]
    if not available:
        return _insufficient_metric(f"No case produced {metric_name}.")
    values = [metric.value for metric in available if metric.value is not None]
    return _available_metric(
        sum(values) / len(values),
        len(values),
        f"Unweighted mean across cases with available {metric_name}.",
    )


def _validation_summary(
    candidates: list[EvidenceEvaluationCandidate],
) -> EvaluationValidationSummary:
    urls = [_canonical_url(candidate.reference.url) for candidate in candidates]
    unique_url_count = len(set(urls))
    return EvaluationValidationSummary(
        candidate_count=len(candidates),
        safe_url_count=len(candidates),
        unique_url_count=unique_url_count,
        duplicate_url_count=len(candidates) - unique_url_count,
    )


def _discounted_gain(relevances: list[int]) -> float:
    return sum(
        (2**relevance - 1) / math.log2(rank + 1)
        for rank, relevance in enumerate(relevances, start=1)
    )


def _canonical_url(url: object) -> str:
    parsed = urlsplit(str(url))
    return urlunsplit(
        (
            parsed.scheme.casefold(),
            parsed.netloc.casefold(),
            parsed.path,
            parsed.query,
            "",
        )
    )


def _available_metric(value: float, sample_size: int, note: str) -> EvaluationMetric:
    return EvaluationMetric(
        status="ok",
        value=min(1.0, max(0.0, value)),
        sample_size=sample_size,
        note=note,
    )


def _insufficient_metric(note: str) -> EvaluationMetric:
    return EvaluationMetric(
        status="insufficient_data",
        value=None,
        sample_size=0,
        note=note,
    )


__all__ = [
    "DEFAULT_EVALUATION_K",
    "EVALUATION_PROTOCOL_VERSION",
    "EVALUATION_SCHEMA_VERSION",
    "EvidenceEvaluationCandidate",
    "EvidenceEvaluationCase",
    "EvidenceEvaluationCorpus",
    "EvidenceEvaluationReport",
    "EvaluatedProviderObservation",
    "evaluate_evidence_corpus",
]
