import { describe, expect, it } from "vitest";
import type { FeedItem } from "./feed-item";
import {
  ALL_CALIBRATED_MEASUREMENT_IDS,
  type CalibratedMeasurementId,
} from "./measurement-calibration";
import { VALIDATION_MEASUREMENT_DEFINITIONS } from "./measurement-validation-definitions";
import {
  analyzeValidationStudy,
  createBlindedAnnotationPacket,
  validateMeasurementValidationStudy,
} from "./measurement-validation-study";

describe("measurement validation study", () => {
  it("defines bilingual 0-4 anchors for every current measurement", () => {
    expect(Object.keys(VALIDATION_MEASUREMENT_DEFINITIONS).sort()).toEqual(
      [...ALL_CALIBRATED_MEASUREMENT_IDS].sort(),
    );

    for (const definition of Object.values(
      VALIDATION_MEASUREMENT_DEFINITIONS,
    )) {
      expect(definition.operationalDefinition.en).not.toBe("");
      expect(definition.operationalDefinition.zh).not.toBe("");
      expect(definition.anchors.map((anchor) => anchor.value)).toEqual([
        0, 1, 2, 3, 4,
      ]);
      expect(
        definition.anchors.every(
          (anchor) => anchor.en.length > 0 && anchor.zh.length > 0,
        ),
      ).toBe(true);
    }
  });

  it("validates a versioned study with English, Chinese, and mixed cases", () => {
    const study = validateMeasurementValidationStudy(perfectAgreementStudy());

    expect(study.schemaVersion).toBe(1);
    expect(study.protocolVersion).toBe(1);
    expect(study.cases.map((studyCase) => studyCase.language)).toEqual([
      "en",
      "zh",
      "mixed",
    ]);
    expect(study.raterIds).toEqual(["rater-a", "rater-b"]);
  });

  it("creates deterministic packets without local scores or annotation leakage", () => {
    const study = perfectAgreementStudy();
    const first = createBlindedAnnotationPacket(study, [
      "stimulation",
      "conflict",
    ]);
    const second = createBlindedAnnotationPacket(study, [
      "stimulation",
      "conflict",
    ]);
    const serialized = JSON.stringify(first);

    expect(first).toEqual(second);
    expect(first.measurements.map((measurement) => measurement.id)).toEqual([
      "stimulation",
      "conflict",
    ]);
    expect(first.cases.map((studyCase) => studyCase.id)).toEqual([
      "case-calm",
      "case-intense",
      "case-mixed",
    ]);
    expect(serialized).not.toContain("localMeasurements");
    expect(serialized).not.toContain("annotations");
    expect(serialized).not.toContain("rater-a");
    expect(serialized).not.toContain("raterIds");
  });

  it("reports perfect agreement and descriptive local-score comparison", () => {
    const report = analyzeValidationStudy(perfectAgreementStudy());
    const stimulation = measurement(report, "stimulation");

    expect(report.studyId).toBe("validation-pilot");
    expect(stimulation.reliabilityStatus).toBe("estimated");
    expect(stimulation.krippendorffAlpha).toBe(1);
    expect(stimulation.ratedCaseCount).toBe(2);
    expect(stimulation.comparableCaseCount).toBe(2);
    expect(stimulation.raterCount).toBe(2);
    expect(stimulation.expectedAnnotationCount).toBe(6);
    expect(stimulation.observedAnnotationCount).toBe(4);
    expect(stimulation.missingAnnotationCount).toBe(2);
    expect(stimulation.missingRate).toBe(33.33);
    expect(stimulation.meanHumanRating).toBe(2);
    expect(stimulation.localScoreMean).toBe(50);
    expect(stimulation.comparisonCaseCount).toBe(2);
    expect(stimulation.meanAbsoluteError).toBe(0);
    expect(stimulation.signedBias).toBe(0);
  });

  it("reports the known systematic-disagreement coefficient", () => {
    const study = perfectAgreementStudy();
    study.annotations = [
      annotation("case-calm", "rater-a", "stimulation", 0),
      annotation("case-calm", "rater-b", "stimulation", 4),
      annotation("case-intense", "rater-a", "stimulation", 0),
      annotation("case-intense", "rater-b", "stimulation", 4),
    ];

    const stimulation = measurement(
      analyzeValidationStudy(study),
      "stimulation",
    );

    expect(stimulation.reliabilityStatus).toBe("estimated");
    expect(stimulation.krippendorffAlpha).toBe(-0.5);
  });

  it("handles explicit and absent ratings as missing data", () => {
    const study = perfectAgreementStudy();
    study.annotations = [
      annotation("case-calm", "rater-a", "stimulation", 0),
      annotation("case-calm", "rater-b", "stimulation", 0),
      annotation("case-intense", "rater-a", "stimulation", null),
    ];

    const stimulation = measurement(
      analyzeValidationStudy(study),
      "stimulation",
    );

    expect(stimulation.reliabilityStatus).toBe("insufficient_data");
    expect(stimulation.krippendorffAlpha).toBeNull();
    expect(stimulation.comparableCaseCount).toBe(1);
    expect(stimulation.observedAnnotationCount).toBe(2);
    expect(stimulation.missingAnnotationCount).toBe(4);
    expect(stimulation.missingRate).toBe(66.67);
  });

  it("does not estimate alpha when expected disagreement is zero", () => {
    const study = perfectAgreementStudy();
    study.annotations = [
      annotation("case-calm", "rater-a", "stimulation", 0),
      annotation("case-calm", "rater-b", "stimulation", 0),
      annotation("case-intense", "rater-a", "stimulation", 0),
      annotation("case-intense", "rater-b", "stimulation", 0),
    ];

    const stimulation = measurement(
      analyzeValidationStudy(study),
      "stimulation",
    );

    expect(stimulation.reliabilityStatus).toBe("insufficient_data");
    expect(stimulation.krippendorffAlpha).toBeNull();
    expect(stimulation.comparableCaseCount).toBe(2);
  });

  it("returns a deterministic report without universal reliability verdicts", () => {
    const study = perfectAgreementStudy();
    const report = analyzeValidationStudy(study);

    expect(report).toEqual(analyzeValidationStudy(study));
    expect(JSON.stringify(report)).not.toMatch(/pass|fail|valid metric/i);
  });

  it.each([
    {
      name: "out-of-range rating",
      mutate: (study: MutableStudy) => {
        (study.annotations[0] as { rating: unknown }).rating = 5;
      },
    },
    {
      name: "unknown metric",
      mutate: (study: MutableStudy) => {
        (
          study.annotations[0] as { measurementId: unknown }
        ).measurementId = "unknown";
      },
    },
    {
      name: "unknown case",
      mutate: (study: MutableStudy) => {
        study.annotations[0].caseId = "case-missing";
      },
    },
    {
      name: "unknown rater",
      mutate: (study: MutableStudy) => {
        study.annotations[0].raterId = "rater-missing";
      },
    },
    {
      name: "duplicate annotation",
      mutate: (study: MutableStudy) => {
        study.annotations.push(structuredClone(study.annotations[0]));
      },
    },
    {
      name: "malformed feed item",
      mutate: (study: MutableStudy) => {
        (study.cases[0].items[0] as { title: unknown }).title = 42;
      },
    },
    {
      name: "direct identifier",
      mutate: (study: MutableStudy) => {
        study.raterIds[0] = "person@example.com";
      },
    },
    {
      name: "out-of-range local score",
      mutate: (study: MutableStudy) => {
        study.cases[0].localMeasurements.stimulation = 101;
      },
    },
  ])("rejects malformed study data: $name", ({ mutate }) => {
    const study = structuredClone(perfectAgreementStudy()) as MutableStudy;
    mutate(study);

    expect(() => validateMeasurementValidationStudy(study)).toThrow(
      /measurement validation study/i,
    );
  });

  it("rejects duplicate and unknown measurement requests for blinded packets", () => {
    expect(() =>
      createBlindedAnnotationPacket(perfectAgreementStudy(), [
        "stimulation",
        "stimulation",
      ]),
    ).toThrow(/annotation packet/i);
    expect(() =>
      createBlindedAnnotationPacket(perfectAgreementStudy(), [
        "not-a-measurement" as CalibratedMeasurementId,
      ]),
    ).toThrow(/annotation packet/i);
  });
});

type MutableStudy = ReturnType<typeof perfectAgreementStudy>;

function perfectAgreementStudy() {
  const localMeasurements = (stimulation: number) =>
    Object.fromEntries(
      ALL_CALIBRATED_MEASUREMENT_IDS.map((id) => [
        id,
        id === "stimulation" ? stimulation : 50,
      ]),
    ) as Record<CalibratedMeasurementId, number>;

  return {
    schemaVersion: 1,
    protocolVersion: 1,
    studyId: "validation-pilot",
    createdAt: "2026-08-06T08:00:00.000Z",
    raterIds: ["rater-a", "rater-b"],
    cases: [
      studyCase(
        "case-calm",
        "en",
        "home",
        "public spaces",
        localMeasurements(0),
      ),
      studyCase(
        "case-intense",
        "zh",
        "watch",
        "breaking news",
        localMeasurements(100),
      ),
      studyCase(
        "case-mixed",
        "mixed",
        "search",
        "travel",
        localMeasurements(50),
      ),
    ],
    annotations: [
      annotation("case-calm", "rater-a", "stimulation", 0),
      annotation("case-calm", "rater-b", "stimulation", 0),
      annotation("case-intense", "rater-a", "stimulation", 4),
      annotation("case-intense", "rater-b", "stimulation", 4),
    ],
  };
}

function studyCase(
  id: string,
  language: "en" | "zh" | "mixed",
  pageType: "home" | "watch" | "search" | "shorts",
  topic: string,
  localMeasurements: Record<CalibratedMeasurementId, number>,
) {
  return {
    id,
    language,
    pageType,
    topic,
    observedAt: "2026-08-06T07:30:00.000Z",
    items: [feedItem(`${id}-item`)],
    localMeasurements,
  };
}

function annotation(
  caseId: string,
  raterId: string,
  measurementId: CalibratedMeasurementId,
  rating: 0 | 1 | 2 | 3 | 4 | null,
) {
  return { caseId, raterId, measurementId, rating };
}

function feedItem(id: string): FeedItem {
  return {
    id,
    platform: "youtube",
    title: `Visible recommendation ${id}`,
    channel: "Public Channel",
    description: "",
    duration: "12:00",
    url: `https://www.youtube.com/watch?v=${id}`,
  };
}

function measurement(
  report: ReturnType<typeof analyzeValidationStudy>,
  id: CalibratedMeasurementId,
) {
  const result = report.measurements.find((entry) => entry.id === id);

  if (!result) {
    throw new Error(`Missing validation report for ${id}.`);
  }

  return result;
}
