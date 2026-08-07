from .evidence_evaluation import EvidenceEvaluationCorpus

BASELINE_EXPECTATIONS = {
    "precision_at_k": 0.60,
    "ndcg_at_k": 0.75,
    "reciprocal_rank": 0.75,
    "category_accuracy": 0.80,
    "provider_status_consistency": 1.0,
}


def _candidate(
    candidate_id: str,
    title: str,
    url: str,
    provider: str,
    category: str,
    relevance: int,
    expected_category: str | None,
    rationale: str,
) -> dict:
    return {
        "candidate_id": candidate_id,
        "reference": {
            "title": title,
            "url": url,
            "provider": provider,
            "category": category,
            "source_name": "Offline evaluation fixture",
        },
        "relevance": relevance,
        "expected_category": expected_category,
        "rationale": rationale,
    }


def _provider(provider: str, status: str, result_count: int) -> dict:
    return {
        "observation": {
            "provider": provider,
            "status": status,
            "result_count": result_count,
            "elapsed_ms": 25,
        },
        "expected_status": status,
        "rationale": "The offline fixture explicitly defines the expected provider state.",
    }


EVIDENCE_RETRIEVAL_BASELINE = EvidenceEvaluationCorpus.model_validate(
    {
        "schema_version": 1,
        "protocol_version": "evidence-relevance-v1",
        "limitations": [
            "This hand-authored corpus is an engineering regression baseline, "
            "not scientific ground truth.",
            "Static candidates do not measure live provider coverage, freshness, "
            "or population-level relevance.",
            "Scores compare visible query-result structure and never estimate "
            "whether a claim is true.",
        ],
        "cases": [
            {
                "schema_version": 1,
                "case_id": "en-air-quality-research",
                "query": "air pollution health effects evidence",
                "language": "en",
                "candidates": [
                    _candidate(
                        "cohort-study",
                        "Long-term air pollution exposure and health outcomes",
                        "https://doi.org/10.1000/air-health",
                        "crossref",
                        "research",
                        2,
                        "research",
                        "The title directly addresses the query and represents research metadata.",
                    ),
                    _candidate(
                        "unrelated-study",
                        "Indoor lighting preferences in office buildings",
                        "https://doi.org/10.1000/lighting",
                        "crossref",
                        "research",
                        0,
                        None,
                        "The source category is valid but the subject does not "
                        "address air pollution.",
                    ),
                    _candidate(
                        "air-pollution-reference",
                        "Air pollution",
                        "https://en.wikipedia.org/?curid=3404",
                        "wikipedia",
                        "reference",
                        1,
                        "reference",
                        "The reference page is topically useful but is not primary "
                        "research evidence.",
                    ),
                ],
                "providers": [
                    _provider("crossref", "success", 2),
                    _provider("wikipedia", "success", 1),
                ],
                "notes": (
                    "English research-oriented query with relevant, partial, "
                    "and irrelevant results."
                ),
            },
            {
                "schema_version": 1,
                "case_id": "zh-population-reference",
                "query": "中国人口普查 统计数据",
                "language": "zh",
                "candidates": [
                    _candidate(
                        "census-reference",
                        "中华人民共和国第七次全国人口普查",
                        "https://zh.wikipedia.org/?curid=7123456",
                        "wikipedia",
                        "reference",
                        2,
                        "reference",
                        "页面主题与查询直接相关，可作为进一步查找官方统计的参考入口。",
                    ),
                    _candidate(
                        "unrelated-reference",
                        "中国电影史",
                        "https://zh.wikipedia.org/?curid=998877",
                        "wikipedia",
                        "reference",
                        0,
                        None,
                        "页面属于有效参考来源类型，但主题与人口普查统计无关。",
                    ),
                    _candidate(
                        "census-research",
                        "Population ageing observed in national census data",
                        "https://doi.org/10.1000/census-ageing",
                        "crossref",
                        "research",
                        1,
                        "research",
                        "研究标题使用人口普查数据，但只覆盖查询主题的一部分。",
                    ),
                ],
                "providers": [
                    _provider("wikipedia", "success", 2),
                    _provider("crossref", "success", 1),
                ],
                "notes": "中文参考型查询，用于检查语言切片和来源类别一致性。",
            },
            {
                "schema_version": 1,
                "case_id": "en-ranking-and-category-errors",
                "query": "renewable electricity grid reliability",
                "language": "en",
                "candidates": [
                    _candidate(
                        "ranking-noise",
                        "Household appliance color preferences",
                        "https://doi.org/10.1000/appliance-color",
                        "crossref",
                        "research",
                        0,
                        None,
                        "The source is normalized correctly but is irrelevant to grid reliability.",
                    ),
                    _candidate(
                        "grid-study",
                        "Renewable generation and electricity grid reliability",
                        "https://doi.org/10.1000/grid-reliability",
                        "crossref",
                        "research",
                        2,
                        "research",
                        "The study title directly addresses renewable generation "
                        "and grid reliability.",
                    ),
                    _candidate(
                        "grid-reference-mislabeled",
                        "Electrical grid",
                        "https://en.wikipedia.org/?curid=12001",
                        "wikipedia",
                        "reporting",
                        1,
                        "reference",
                        "The candidate is useful as a reference but intentionally "
                        "miscategorized for calibration.",
                    ),
                ],
                "providers": [
                    _provider("crossref", "success", 2),
                    _provider("wikipedia", "success", 1),
                ],
                "notes": "Negative-control case preserving visible ranking and category errors.",
            },
            {
                "schema_version": 1,
                "case_id": "zh-empty-results",
                "query": "不存在的离线检索样例词组",
                "language": "zh",
                "candidates": [],
                "providers": [
                    _provider("crossref", "empty", 0),
                    _provider("wikipedia", "empty", 0),
                ],
                "notes": "Empty-result control demonstrating explicit insufficient-data metrics.",
            },
            {
                "schema_version": 1,
                "case_id": "en-provider-failures",
                "query": "public transport accessibility evidence",
                "language": "en",
                "candidates": [],
                "providers": [
                    _provider("crossref", "timeout", 0),
                    _provider("wikipedia", "error", 0),
                ],
                "notes": (
                    "Provider-failure control kept separate from an empty "
                    "successful response."
                ),
            },
        ],
    }
)


__all__ = ["BASELINE_EXPECTATIONS", "EVIDENCE_RETRIEVAL_BASELINE"]
