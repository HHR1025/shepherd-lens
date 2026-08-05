from collections.abc import Iterable

from .models import (
    API_SCHEMA_VERSION,
    AnalysisObservation,
    AnalyzeFeedRequest,
    AnalyzeFeedResponse,
    InputSummary,
    Interpretation,
    MeasuredSignal,
    Uncertainty,
)

ATTENTION_IDS = ("stimulation", "conflict", "repetition", "short_form")
DIVERSITY_IDS = ("source_diversity", "visible_feed_entropy")
DRIFT_THRESHOLD = 10


def analyze_feed(request: AnalyzeFeedRequest) -> AnalyzeFeedResponse:
    attention = interpret_attention(request.attention_signals)
    diversity = interpret_diversity(request.structure_metrics)
    drift = interpret_drift(request)
    uncertainty = derive_uncertainty(request)

    return AnalyzeFeedResponse(
        analysis_version=API_SCHEMA_VERSION,
        mode="deterministic",
        attention_climate=attention,
        feed_diversity=diversity,
        drift=drift,
        observations=build_observations(
            attention,
            diversity,
            drift,
            len(request.evidence_references),
        ),
        uncertainty=uncertainty,
        evidence_references=request.evidence_references,
        input_summary=InputSummary(
            feed_item_count=len(request.feed_items),
            attention_signal_count=len(request.attention_signals),
            structure_metric_count=len(request.structure_metrics),
            evidence_reference_count=len(request.evidence_references),
            page_type=request.context.page_type,
        ),
    )


def interpret_attention(signals: list[MeasuredSignal]) -> Interpretation:
    candidates = ordered_measurements(signals, ATTENTION_IDS)
    if not candidates:
        return Interpretation(label="unknown", value=None, basis=[])

    strongest = max(candidates, key=lambda signal: signal.value)
    label = "elevated" if strongest.value >= 67 else "moderate" if strongest.value >= 34 else "calm"
    return Interpretation(
        label=label,
        value=strongest.value,
        basis=[f"attention:{strongest.id}"],
    )


def interpret_diversity(metrics: list[MeasuredSignal]) -> Interpretation:
    candidates = ordered_measurements(metrics, DIVERSITY_IDS)
    if not candidates:
        return Interpretation(label="unknown", value=None, basis=[])

    value = round(sum(metric.value for metric in candidates) / len(candidates), 2)
    label = "high" if value >= 67 else "moderate" if value >= 34 else "low"
    return Interpretation(
        label=label,
        value=value,
        basis=[f"structure:{metric.id}" for metric in candidates],
    )


def interpret_drift(request: AnalyzeFeedRequest) -> Interpretation:
    if request.history is None:
        return Interpretation(label="unavailable", value=None, basis=[])

    comparisons = [
        *measurement_deltas(
            request.attention_signals,
            request.history.previous_attention_signals,
            "attention",
        ),
        *measurement_deltas(
            request.structure_metrics,
            request.history.previous_structure_metrics,
            "structure",
        ),
    ]
    if not comparisons:
        return Interpretation(label="unavailable", value=None, basis=[])

    significant = [
        comparison
        for comparison in comparisons
        if abs(comparison[1]) >= DRIFT_THRESHOLD
    ]
    if not significant:
        return Interpretation(
            label="steady",
            value=max(abs(delta) for _, delta in comparisons),
            basis=[max(comparisons, key=lambda item: abs(item[1]))[0]],
        )

    directions = {1 if delta > 0 else -1 for _, delta in significant}
    strongest = max(significant, key=lambda item: abs(item[1]))
    label = "mixed" if len(directions) > 1 else "increasing" if strongest[1] > 0 else "decreasing"
    return Interpretation(
        label=label,
        value=round(strongest[1], 2),
        basis=[strongest[0]],
    )


def derive_uncertainty(request: AnalyzeFeedRequest) -> Uncertainty:
    codes: list[str] = []
    notes: list[str] = []

    if len(request.feed_items) < 5:
        codes.append("small_visible_sample")
        notes.append("The visible sample is too small for a strong interpretation.")
    if not request.attention_signals:
        codes.append("missing_attention_signals")
        notes.append("No attention measurements were supplied.")
    if not request.structure_metrics:
        codes.append("missing_structure_metrics")
        notes.append("No feed-structure measurements were supplied.")
    if request.history is None:
        codes.append("missing_history_context")
        notes.append("No local history was supplied, so drift is unavailable.")
    if not request.evidence_references:
        codes.append("no_evidence_references")
        notes.append("No evidence references were supplied; this is not a truth judgment.")

    if len(request.feed_items) < 5:
        boundary = "weak_signal"
    elif request.history is not None and request.history.snapshot_count >= 3:
        boundary = "session_trend"
    else:
        boundary = "page_snapshot"

    return Uncertainty(
        observation_boundary=boundary,
        codes=codes,
        notes=notes,
    )


def build_observations(
    attention: Interpretation,
    diversity: Interpretation,
    drift: Interpretation,
    evidence_count: int,
) -> list[AnalysisObservation]:
    observations: list[AnalysisObservation] = []

    if attention.basis:
        observations.append(
            AnalysisObservation(
                code="attention_climate",
                message=f"Attention climate is {attention.label} in the supplied visible sample.",
                basis=attention.basis,
            )
        )
    if diversity.basis:
        observations.append(
            AnalysisObservation(
                code="feed_diversity",
                message=f"Feed diversity is {diversity.label} in the supplied visible sample.",
                basis=diversity.basis,
            )
        )
    if drift.basis:
        observations.append(
            AnalysisObservation(
                code="local_drift",
                message=f"Local measured change is {drift.label} relative to supplied history.",
                basis=drift.basis,
            )
        )
    if evidence_count > 0:
        observations.append(
            AnalysisObservation(
                code="evidence_available",
                message=(
                    f"{evidence_count} evidence reference"
                    f"{'s were' if evidence_count != 1 else ' was'} supplied; "
                    "availability is not verification."
                ),
                basis=[f"evidence:{index}" for index in range(evidence_count)],
            )
        )

    return observations


def ordered_measurements(
    measurements: Iterable[MeasuredSignal],
    identifiers: tuple[str, ...],
) -> list[MeasuredSignal]:
    by_id = {measurement.id: measurement for measurement in measurements}
    return [by_id[identifier] for identifier in identifiers if identifier in by_id]


def measurement_deltas(
    current: list[MeasuredSignal],
    previous: list[MeasuredSignal],
    kind: str,
) -> list[tuple[str, float]]:
    previous_by_id = {measurement.id: measurement for measurement in previous}
    return [
        (
            f"{kind}:{measurement.id}",
            round(measurement.value - previous_by_id[measurement.id].value, 2),
        )
        for measurement in current
        if measurement.id in previous_by_id
    ]
