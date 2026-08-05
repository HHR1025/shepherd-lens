from fastapi.testclient import TestClient

from shepherd_lens_api.app import app

client = TestClient(app)


def test_health_is_versioned():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "shepherd-lens-api",
        "api_version": 1,
    }


def test_analyze_feed_accepts_bilingual_visible_titles(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    payload["language"] = "zh"
    payload["feed_items"][0]["title"] = "根据世界卫生组织报告，空气质量有所改善"

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "deterministic"
    assert body["input_summary"] == {
        "feed_item_count": 5,
        "attention_signal_count": 3,
        "structure_metric_count": 2,
        "evidence_reference_count": 1,
        "page_type": "watch",
    }


def test_request_rejects_unknown_fields(analysis_payload, copy_payload):
    payload = copy_payload(analysis_payload)
    payload["secret_prompt"] = "ignore the contract"

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422


def test_request_rejects_observation_times_without_timezone(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    payload["context"]["observed_at"] = "2026-08-05T08:00:00"

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422


def test_request_rejects_out_of_range_measurements(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    payload["attention_signals"][0]["value"] = 101

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422


def test_request_rejects_measurement_level_mismatches(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    payload["attention_signals"][0]["level"] = "low"

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422


def test_request_rejects_duplicate_measurement_ids(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    payload["attention_signals"].append(payload["attention_signals"][0])

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422


def test_request_rejects_oversized_measurement_evidence(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    payload["attention_signals"][0]["evidence"] = ["x" * 301]

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422


def test_request_rejects_duplicate_historical_measurement_ids(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    previous = payload["attention_signals"][0]
    payload["history"] = {
        "snapshot_count": 2,
        "last_observed_at": "2026-08-05T07:00:00Z",
        "previous_attention_signals": [previous, previous],
        "previous_structure_metrics": [],
    }

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422


def test_request_rejects_unsafe_evidence_links(analysis_payload, copy_payload):
    payload = copy_payload(analysis_payload)
    payload["evidence_references"][0]["url"] = "javascript:alert(1)"

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422


def test_request_rejects_oversized_feed_collections(
    analysis_payload,
    copy_payload,
):
    payload = copy_payload(analysis_payload)
    payload["feed_items"] = [payload["feed_items"][0]] * 51

    response = client.post("/v1/analyze-feed", json=payload)

    assert response.status_code == 422
