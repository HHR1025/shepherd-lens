import math

import pytest
from pydantic import ValidationError

from shepherd_lens_api.evidence_evaluation import (
    EvaluatedProviderObservation,
    EvidenceEvaluationCandidate,
    EvidenceEvaluationCase,
    EvidenceEvaluationCorpus,
    evaluate_evidence_corpus,
)
from shepherd_lens_api.evidence_evaluation_cli import main as evaluation_cli_main
from shepherd_lens_api.evidence_evaluation_corpus import (
    BASELINE_EXPECTATIONS,
    EVIDENCE_RETRIEVAL_BASELINE,
)


def candidate(
    candidate_id: str,
    url: str,
    relevance: int,
    *,
    provider: str = "crossref",
    category: str = "research",
    expected_category: str | None = None,
) -> dict:
    return {
        "candidate_id": candidate_id,
        "reference": {
            "title": f"Candidate {candidate_id}",
            "url": url,
            "provider": provider,
            "category": category,
            "source_name": "Test source",
        },
        "relevance": relevance,
        "expected_category": expected_category,
        "rationale": "A bounded test judgment with an explicit rationale.",
    }


def provider(
    name: str,
    status: str,
    result_count: int,
    *,
    expected_status: str | None = None,
) -> dict:
    return {
        "observation": {
            "provider": name,
            "status": status,
            "result_count": result_count,
            "elapsed_ms": 12,
        },
        "expected_status": expected_status or status,
        "rationale": "Expected provider behavior for this offline case.",
    }


def evaluation_case(
    candidates: list[dict],
    providers: list[dict],
    *,
    case_id: str = "case-one",
    language: str = "en",
) -> EvidenceEvaluationCase:
    return EvidenceEvaluationCase.model_validate(
        {
            "schema_version": 1,
            "case_id": case_id,
            "query": "air pollution health evidence",
            "language": language,
            "candidates": candidates,
            "providers": providers,
            "notes": "Synthetic offline evaluation case; not scientific ground truth.",
        }
    )


def corpus(*cases: EvidenceEvaluationCase) -> EvidenceEvaluationCorpus:
    return EvidenceEvaluationCorpus(
        schema_version=1,
        protocol_version="evidence-relevance-v1",
        cases=list(cases),
        limitations=[
            "The corpus is an engineering regression baseline.",
            "It does not establish retrieval validity on live user queries.",
        ],
    )


def test_perfect_ranking_produces_bounded_deterministic_metrics():
    case = evaluation_case(
        [
            candidate(
                "best",
                "https://doi.org/10.1000/best",
                2,
                expected_category="research",
            ),
            candidate(
                "useful",
                "https://en.wikipedia.org/?curid=1",
                1,
                provider="wikipedia",
                category="reference",
                expected_category="reference",
            ),
            candidate("noise", "https://doi.org/10.1000/noise", 0),
        ],
        [provider("crossref", "success", 2), provider("wikipedia", "success", 1)],
    )

    first = evaluate_evidence_corpus(corpus(case), k=3)
    second = evaluate_evidence_corpus(corpus(case), k=3)

    assert first == second
    assert first.schema_version == 1
    assert first.k == 3
    assert first.aggregate.metrics.precision_at_k.value == pytest.approx(2 / 3)
    assert first.aggregate.metrics.ndcg_at_k.value == 1
    assert first.aggregate.metrics.reciprocal_rank.value == 1
    assert first.aggregate.metrics.category_accuracy.value == 1
    assert first.aggregate.metrics.provider_status_consistency.value == 1
    assert first.cases[0].validation.safe_url_count == 3
    assert first.cases[0].validation.duplicate_url_count == 0


def test_partial_ranking_reports_rank_loss_and_category_mismatch():
    case = evaluation_case(
        [
            candidate("noise", "https://doi.org/10.1000/noise", 0),
            candidate(
                "best",
                "https://doi.org/10.1000/best",
                2,
                category="reference",
                expected_category="research",
            ),
            candidate(
                "useful",
                "https://en.wikipedia.org/?curid=2",
                1,
                provider="wikipedia",
                category="reference",
                expected_category="reference",
            ),
        ],
        [provider("crossref", "success", 2), provider("wikipedia", "success", 1)],
    )

    report = evaluate_evidence_corpus(corpus(case), k=3).cases[0]

    ideal_dcg = 3 + 1 / math.log2(3)
    actual_dcg = 3 / math.log2(3) + 1 / math.log2(4)
    assert report.metrics.precision_at_k.value == pytest.approx(2 / 3)
    assert report.metrics.ndcg_at_k.value == pytest.approx(actual_dcg / ideal_dcg)
    assert report.metrics.reciprocal_rank.value == 0.5
    assert report.metrics.category_accuracy.value == 0.5


def test_no_relevant_candidates_keeps_defined_metrics_and_marks_ndcg_unavailable():
    case = evaluation_case(
        [candidate("noise", "https://doi.org/10.1000/noise", 0)],
        [provider("crossref", "success", 1)],
    )

    metrics = evaluate_evidence_corpus(corpus(case)).cases[0].metrics

    assert metrics.precision_at_k.value == 0
    assert metrics.reciprocal_rank.value == 0
    assert metrics.ndcg_at_k.status == "insufficient_data"
    assert metrics.ndcg_at_k.value is None
    assert metrics.category_accuracy.status == "insufficient_data"


def test_empty_results_use_explicit_insufficient_data_states():
    case = evaluation_case(
        [],
        [provider("crossref", "empty", 0), provider("wikipedia", "empty", 0)],
    )

    metrics = evaluate_evidence_corpus(corpus(case)).cases[0].metrics

    assert metrics.precision_at_k.status == "insufficient_data"
    assert metrics.ndcg_at_k.status == "insufficient_data"
    assert metrics.reciprocal_rank.status == "insufficient_data"
    assert metrics.category_accuracy.status == "insufficient_data"
    assert metrics.provider_status_consistency.value == 1


def test_provider_status_consistency_compares_observed_and_expected_states():
    case = evaluation_case(
        [],
        [
            provider("crossref", "timeout", 0, expected_status="success"),
            provider("wikipedia", "error", 0, expected_status="error"),
        ],
    )

    metric = evaluate_evidence_corpus(corpus(case)).cases[0].metrics.provider_status_consistency

    assert metric.status == "ok"
    assert metric.value == 0.5
    assert metric.sample_size == 2


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("relevance", -1),
        ("relevance", 3),
        ("relevance", True),
        ("candidate_id", "not valid"),
        ("rationale", "short"),
    ],
)
def test_candidate_contract_rejects_invalid_judgments(field, value):
    payload = candidate(
        "candidate-one",
        "https://doi.org/10.1000/example",
        2,
        expected_category="research",
    )
    payload[field] = value

    with pytest.raises(ValidationError):
        EvidenceEvaluationCandidate.model_validate(payload)


def test_case_contract_rejects_duplicate_ids_urls_and_provider_counts():
    first = candidate("same", "https://doi.org/10.1000/example", 0)
    duplicate_id = candidate("same", "https://doi.org/10.1000/other", 0)
    duplicate_url = candidate("other", "https://doi.org/10.1000/example", 0)

    with pytest.raises(ValidationError, match="candidate identifiers"):
        evaluation_case([first, duplicate_id], [provider("crossref", "success", 2)])

    with pytest.raises(ValidationError, match="candidate URLs"):
        evaluation_case([first, duplicate_url], [provider("crossref", "success", 2)])

    fragment_variant = candidate(
        "fragment",
        "https://doi.org/10.1000/example#details",
        0,
    )
    with pytest.raises(ValidationError, match="candidate URLs"):
        evaluation_case([first, fragment_variant], [provider("crossref", "success", 2)])

    with pytest.raises(ValidationError, match="result_count"):
        evaluation_case([first], [provider("crossref", "success", 2)])


def test_case_contract_rejects_unsafe_urls_unknown_providers_and_extra_fields():
    unsafe = candidate("unsafe", "javascript:alert(1)", 0)
    unknown = candidate(
        "unknown",
        "https://example.com/source",
        1,
        provider="unknown",
        expected_category="research",
    )
    credentials = candidate(
        "credentials",
        "https://user:secret@example.com/source",
        1,
        expected_category="research",
    )

    with pytest.raises(ValidationError):
        EvidenceEvaluationCandidate.model_validate(unsafe)
    with pytest.raises(ValidationError, match="supported evidence provider"):
        EvidenceEvaluationCandidate.model_validate(unknown)
    with pytest.raises(ValidationError, match="credentials"):
        EvidenceEvaluationCandidate.model_validate(credentials)

    payload = provider("crossref", "empty", 0)
    payload["unexpected"] = True
    with pytest.raises(ValidationError):
        EvaluatedProviderObservation.model_validate(payload)


def test_corpus_rejects_duplicate_case_ids_and_unsupported_protocols():
    case = evaluation_case([], [provider("crossref", "empty", 0)])

    with pytest.raises(ValidationError, match="case identifiers"):
        corpus(case, case)

    with pytest.raises(ValidationError):
        EvidenceEvaluationCorpus(
            schema_version=1,
            protocol_version="future-version",
            cases=[case],
            limitations=["One limitation.", "Another limitation."],
        )


def test_bilingual_baseline_is_valid_deterministic_and_within_documented_ranges():
    first = evaluate_evidence_corpus(EVIDENCE_RETRIEVAL_BASELINE)
    second = evaluate_evidence_corpus(EVIDENCE_RETRIEVAL_BASELINE)

    assert first == second
    assert {slice_.language for slice_ in first.language_slices} == {"en", "zh"}
    assert {slice_.provider for slice_ in first.provider_slices} == {
        "crossref",
        "wikipedia",
    }
    assert first.aggregate.case_count == len(EVIDENCE_RETRIEVAL_BASELINE.cases)
    assert first.aggregate.validation.duplicate_url_count == 0

    metrics = first.aggregate.metrics
    for metric_name, minimum in BASELINE_EXPECTATIONS.items():
        metric = getattr(metrics, metric_name)
        assert metric.status == "ok"
        assert metric.value is not None
        assert metric.value >= minimum


def test_baseline_cli_emits_a_machine_readable_report(capsys):
    exit_code = evaluation_cli_main(["--k", "3"])

    output = capsys.readouterr().out
    assert exit_code == 0
    assert '"protocol_version": "evidence-relevance-v1"' in output
    assert '"case_count": 5' in output
