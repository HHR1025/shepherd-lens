from shepherd_lens_api.analysis import analyze_feed
from shepherd_lens_api.models import AnalyzeFeedRequest


def test_analysis_is_deterministic_and_traceable(analysis_payload):
    request = AnalyzeFeedRequest.model_validate(analysis_payload)

    first = analyze_feed(request)
    second = analyze_feed(request)

    assert first == second
    assert first.analysis_version == 1
    assert first.mode == "deterministic"
    assert first.attention_climate.label == "elevated"
    assert first.attention_climate.basis == ["attention:stimulation"]
    assert first.feed_diversity.label == "low"
    assert first.feed_diversity.basis == [
        "structure:source_diversity",
        "structure:visible_feed_entropy",
    ]
    assert all(observation.basis for observation in first.observations)
    assert first.evidence_references[0].source_name == "World Health Organization"


def test_small_samples_are_reported_as_weak_signals(analysis_payload, copy_payload):
    payload = copy_payload(analysis_payload)
    payload["feed_items"] = payload["feed_items"][:2]

    result = analyze_feed(AnalyzeFeedRequest.model_validate(payload))

    assert result.uncertainty.observation_boundary == "weak_signal"
    assert "small_visible_sample" in result.uncertainty.codes
    assert result.drift.label == "unavailable"


def test_history_context_produces_bounded_drift_interpretation(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    payload["history"] = {
        "snapshot_count": 8,
        "last_observed_at": "2026-08-05T07:00:00Z",
        "previous_attention_signals": [
            {
                "id": "stimulation",
                "label": "Stimulation",
                "value": 42,
                "level": "moderate",
                "evidence": ["previous snapshot"],
            },
            {
                "id": "conflict",
                "label": "Conflict",
                "value": 18,
                "level": "low",
                "evidence": ["previous snapshot"],
            },
        ],
        "previous_structure_metrics": [],
    }

    result = analyze_feed(AnalyzeFeedRequest.model_validate(payload))

    assert result.drift.label == "increasing"
    assert result.drift.basis == ["attention:stimulation"]
    assert result.uncertainty.observation_boundary == "session_trend"


def test_missing_measurements_remain_unknown(analysis_payload, copy_payload):
    payload = copy_payload(analysis_payload)
    payload["attention_signals"] = []
    payload["structure_metrics"] = []

    result = analyze_feed(AnalyzeFeedRequest.model_validate(payload))

    assert result.attention_climate.label == "unknown"
    assert result.feed_diversity.label == "unknown"
    assert "missing_attention_signals" in result.uncertainty.codes
    assert "missing_structure_metrics" in result.uncertainty.codes
