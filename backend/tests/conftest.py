from copy import deepcopy

import pytest


@pytest.fixture
def analysis_payload() -> dict:
    return {
        "schema_version": 1,
        "language": "en",
        "feed_items": [
            {
                "title": "According to WHO data, air quality improved",
                "channel": "Public Health Review",
                "description": "A review of the latest report.",
                "duration": "12:40",
                "url": "https://www.youtube.com/watch?v=example-1",
            },
            {
                "title": "City transport policy explained",
                "channel": "Urban Research",
                "description": "",
                "duration": "08:20",
                "url": "https://www.youtube.com/watch?v=example-2",
            },
            {
                "title": "What changed in this week's recommendations?",
                "channel": "Media Notes",
                "description": "",
                "duration": "10:05",
                "url": "https://www.youtube.com/watch?v=example-3",
            },
            {
                "title": "Research methods for recommendation audits",
                "channel": "Open Methods",
                "description": "",
                "duration": "18:00",
                "url": "https://www.youtube.com/watch?v=example-4",
            },
            {
                "title": "A calm local documentary",
                "channel": "Local Stories",
                "description": "",
                "duration": "22:10",
                "url": "https://www.youtube.com/watch?v=example-5",
            },
        ],
        "attention_signals": [
            {
                "id": "stimulation",
                "label": "Stimulation",
                "value": 82,
                "level": "high",
                "evidence": ["visible title intensity"],
            },
            {
                "id": "conflict",
                "label": "Conflict",
                "value": 20,
                "level": "low",
                "evidence": ["few visible conflict terms"],
            },
            {
                "id": "repetition",
                "label": "Repetition",
                "value": 15,
                "level": "low",
                "evidence": ["limited repeated titles"],
            },
        ],
        "structure_metrics": [
            {
                "id": "source_diversity",
                "label": "Source diversity",
                "value": 25,
                "level": "low",
                "evidence": ["five visible channels"],
            },
            {
                "id": "visible_feed_entropy",
                "label": "Feed entropy",
                "value": 40,
                "level": "moderate",
                "evidence": ["partial topic variety"],
            },
        ],
        "context": {
            "page_type": "watch",
            "observed_at": "2026-08-05T08:00:00Z",
        },
        "evidence_references": [
            {
                "title": "WHO public report",
                "url": "https://www.who.int/publications/example",
                "provider": "manual",
                "category": "primary",
                "source_name": "World Health Organization",
            }
        ],
    }


@pytest.fixture
def copy_payload():
    return deepcopy
