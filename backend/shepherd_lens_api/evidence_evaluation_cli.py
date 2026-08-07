import argparse
from collections.abc import Sequence

from .evidence_evaluation import DEFAULT_EVALUATION_K, evaluate_evidence_corpus
from .evidence_evaluation_corpus import EVIDENCE_RETRIEVAL_BASELINE


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate the offline Shepherd Lens evidence-retrieval baseline."
    )
    parser.add_argument(
        "--k",
        type=int,
        default=DEFAULT_EVALUATION_K,
        help="ranking depth to evaluate",
    )
    arguments = parser.parse_args(argv)
    report = evaluate_evidence_corpus(EVIDENCE_RETRIEVAL_BASELINE, k=arguments.k)
    print(report.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
