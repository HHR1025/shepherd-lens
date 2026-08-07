import type { FeedItem } from "./feed-item";
import {
  ALL_CALIBRATED_MEASUREMENT_IDS,
  type CalibratedMeasurementId,
  type CalibrationLanguage,
} from "./measurement-calibration";
import {
  VALIDATION_MEASUREMENT_DEFINITIONS,
  type OrdinalValidationAnchor,
} from "./measurement-validation-definitions";
import { isFeedItem, isFiniteNumber, isRecord, isString } from "./runtime-schema";

export const MEASUREMENT_VALIDATION_SCHEMA_VERSION = 1 as const;
export const MEASUREMENT_VALIDATION_PROTOCOL_VERSION = 1 as const;

export type ValidationPageType = "home" | "watch" | "search" | "shorts";
export type OrdinalValidationRating = 0 | 1 | 2 | 3 | 4;

export type MeasurementValidationCase = {
  id: string;
  language: CalibrationLanguage;
  pageType: ValidationPageType;
  topic: string;
  observedAt: string;
  items: FeedItem[];
  localMeasurements: Partial<Record<CalibratedMeasurementId, number>>;
};

export type MeasurementValidationAnnotation = {
  caseId: string;
  raterId: string;
  measurementId: CalibratedMeasurementId;
  rating: OrdinalValidationRating | null;
};

export type MeasurementValidationStudy = {
  schemaVersion: typeof MEASUREMENT_VALIDATION_SCHEMA_VERSION;
  protocolVersion: typeof MEASUREMENT_VALIDATION_PROTOCOL_VERSION;
  studyId: string;
  createdAt: string;
  raterIds: string[];
  cases: MeasurementValidationCase[];
  annotations: MeasurementValidationAnnotation[];
};

export type BlindedMeasurementPrompt = {
  id: CalibratedMeasurementId;
  name: { en: string; zh: string };
  operationalDefinition: { en: string; zh: string };
  anchors: OrdinalValidationAnchor[];
};

export type BlindedAnnotationPacket = {
  schemaVersion: typeof MEASUREMENT_VALIDATION_SCHEMA_VERSION;
  protocolVersion: typeof MEASUREMENT_VALIDATION_PROTOCOL_VERSION;
  studyId: string;
  measurements: BlindedMeasurementPrompt[];
  cases: Array<
    Omit<MeasurementValidationCase, "localMeasurements"> & {
      items: FeedItem[];
    }
  >;
};

export type MeasurementReliabilityReport = {
  id: CalibratedMeasurementId;
  reliabilityStatus: "estimated" | "insufficient_data";
  krippendorffAlpha: number | null;
  ratedCaseCount: number;
  comparableCaseCount: number;
  raterCount: number;
  expectedAnnotationCount: number;
  observedAnnotationCount: number;
  missingAnnotationCount: number;
  missingRate: number;
  meanHumanRating: number | null;
  localScoreMean: number | null;
  comparisonCaseCount: number;
  meanAbsoluteError: number | null;
  signedBias: number | null;
};

export type MeasurementValidationReport = {
  schemaVersion: typeof MEASUREMENT_VALIDATION_SCHEMA_VERSION;
  protocolVersion: typeof MEASUREMENT_VALIDATION_PROTOCOL_VERSION;
  studyId: string;
  caseCount: number;
  declaredRaterCount: number;
  measurements: MeasurementReliabilityReport[];
};

const measurementIds = new Set<string>(ALL_CALIBRATED_MEASUREMENT_IDS);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const raterIdPattern = /^rater-[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function validateMeasurementValidationStudy(
  value: unknown,
): MeasurementValidationStudy {
  if (
    !isRecord(value) ||
    value.schemaVersion !== MEASUREMENT_VALIDATION_SCHEMA_VERSION ||
    value.protocolVersion !== MEASUREMENT_VALIDATION_PROTOCOL_VERSION ||
    !isString(value.studyId) ||
    !slugPattern.test(value.studyId) ||
    !isIsoTimestamp(value.createdAt) ||
    !Array.isArray(value.raterIds) ||
    value.raterIds.length < 2 ||
    value.raterIds.length > 50 ||
    !value.raterIds.every(isOpaqueRaterId) ||
    !Array.isArray(value.cases) ||
    value.cases.length === 0 ||
    value.cases.length > 500 ||
    !Array.isArray(value.annotations) ||
    value.annotations.length > 250_000
  ) {
    return invalid("expected a bounded, versioned study");
  }

  const studyId = value.studyId;
  const createdAt = value.createdAt;
  const raterIds = [...value.raterIds];

  assertUnique(raterIds, "rater ids");

  const cases = value.cases.map(validateStudyCase);
  const caseIds = cases.map((studyCase) => studyCase.id);

  assertUnique(caseIds, "case ids");

  const caseIdSet = new Set(caseIds);
  const raterIdSet = new Set(raterIds);
  const annotations = value.annotations.map((annotation, index) =>
    validateAnnotation(annotation, index, caseIdSet, raterIdSet),
  );
  const annotationKeys = annotations.map(
    (annotation) =>
      `${annotation.caseId}\u0000${annotation.raterId}\u0000${annotation.measurementId}`,
  );

  assertUnique(annotationKeys, "case-rater-measurement annotations");

  return {
    schemaVersion: MEASUREMENT_VALIDATION_SCHEMA_VERSION,
    protocolVersion: MEASUREMENT_VALIDATION_PROTOCOL_VERSION,
    studyId,
    createdAt,
    raterIds,
    cases,
    annotations,
  };
}

export function createBlindedAnnotationPacket(
  studyValue: unknown,
  requestedMeasurementIds: readonly CalibratedMeasurementId[] =
    ALL_CALIBRATED_MEASUREMENT_IDS,
): BlindedAnnotationPacket {
  const study = validateMeasurementValidationStudy(studyValue);

  return {
    schemaVersion: study.schemaVersion,
    protocolVersion: study.protocolVersion,
    studyId: study.studyId,
    measurements: createBlindedMeasurementPrompts(requestedMeasurementIds),
    cases: study.cases.map((studyCase) => ({
      id: studyCase.id,
      language: studyCase.language,
      pageType: studyCase.pageType,
      topic: studyCase.topic,
      observedAt: studyCase.observedAt,
      items: studyCase.items.map(cloneFeedItem),
    })),
  };
}

export function createBlindedMeasurementPrompts(
  requestedMeasurementIds: readonly CalibratedMeasurementId[] =
    ALL_CALIBRATED_MEASUREMENT_IDS,
) {
  const ids = [...requestedMeasurementIds];

  if (
    ids.length === 0 ||
    ids.some((id) => !measurementIds.has(id)) ||
    new Set(ids).size !== ids.length
  ) {
    throw new Error(
      "Invalid annotation packet: measurement ids must be known and unique.",
    );
  }

  return ids.map((id) => cloneDefinition(id));
}

export function analyzeValidationStudy(
  studyValue: unknown,
): MeasurementValidationReport {
  const study = validateMeasurementValidationStudy(studyValue);

  return {
    schemaVersion: study.schemaVersion,
    protocolVersion: study.protocolVersion,
    studyId: study.studyId,
    caseCount: study.cases.length,
    declaredRaterCount: study.raterIds.length,
    measurements: ALL_CALIBRATED_MEASUREMENT_IDS.map((id) =>
      analyzeMeasurement(study, id),
    ),
  };
}

function validateStudyCase(
  value: unknown,
  index: number,
): MeasurementValidationCase {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !slugPattern.test(value.id) ||
    !isLanguage(value.language) ||
    !isPageType(value.pageType) ||
    !isString(value.topic) ||
    value.topic.trim().length === 0 ||
    value.topic.length > 120 ||
    !isIsoTimestamp(value.observedAt) ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > 50 ||
    !value.items.every(isFeedItem) ||
    !isRecord(value.localMeasurements) ||
    Object.keys(value.localMeasurements).length === 0
  ) {
    return invalid(`case ${index} has an invalid shape`);
  }

  const id = value.id;
  const localMeasurements = Object.fromEntries(
    Object.entries(value.localMeasurements).map(([measurementId, score]) => {
      if (!measurementIds.has(measurementId) || !isBoundedScore(score)) {
        return invalid(
          `case ${id} has an invalid local measurement ${measurementId}`,
        );
      }

      return [measurementId, score] as const;
    }),
  );

  return {
    id,
    language: value.language,
    pageType: value.pageType,
    topic: value.topic.trim(),
    observedAt: value.observedAt,
    items: value.items.map(cloneFeedItem),
    localMeasurements,
  };
}

function validateAnnotation(
  value: unknown,
  index: number,
  caseIds: Set<string>,
  raterIds: Set<string>,
): MeasurementValidationAnnotation {
  if (
    !isRecord(value) ||
    !isString(value.caseId) ||
    !caseIds.has(value.caseId) ||
    !isString(value.raterId) ||
    !raterIds.has(value.raterId) ||
    !isString(value.measurementId) ||
    !measurementIds.has(value.measurementId) ||
    !isRating(value.rating)
  ) {
    return invalid(`annotation ${index} has an invalid shape or reference`);
  }

  return {
    caseId: value.caseId,
    raterId: value.raterId,
    measurementId: value.measurementId as CalibratedMeasurementId,
    rating: value.rating,
  };
}

function analyzeMeasurement(
  study: MeasurementValidationStudy,
  id: CalibratedMeasurementId,
): MeasurementReliabilityReport {
  const annotations = study.annotations.filter(
    (annotation) => annotation.measurementId === id,
  );
  const observed = annotations.filter(
    (
      annotation,
    ): annotation is MeasurementValidationAnnotation & {
      rating: OrdinalValidationRating;
    } => annotation.rating !== null,
  );
  const ratingsByCase = new Map<string, OrdinalValidationRating[]>();

  for (const annotation of observed) {
    const ratings = ratingsByCase.get(annotation.caseId) ?? [];
    ratings.push(annotation.rating);
    ratingsByCase.set(annotation.caseId, ratings);
  }

  const alpha = calculateKrippendorffAlpha(ratingsByCase);
  const comparisons = study.cases.flatMap((studyCase) => {
    const ratings = ratingsByCase.get(studyCase.id) ?? [];
    const localScore = studyCase.localMeasurements[id];

    if (ratings.length === 0 || localScore === undefined) {
      return [];
    }

    const normalizedHumanScore = (mean(ratings) / 4) * 100;

    return [
      {
        localScore,
        absoluteError: Math.abs(localScore - normalizedHumanScore),
        signedBias: localScore - normalizedHumanScore,
      },
    ];
  });
  const expectedAnnotationCount = study.cases.length * study.raterIds.length;
  const observedAnnotationCount = observed.length;
  const missingAnnotationCount =
    expectedAnnotationCount - observedAnnotationCount;

  return {
    id,
    reliabilityStatus:
      alpha === null ? "insufficient_data" : "estimated",
    krippendorffAlpha: alpha,
    ratedCaseCount: ratingsByCase.size,
    comparableCaseCount: [...ratingsByCase.values()].filter(
      (ratings) => ratings.length >= 2,
    ).length,
    raterCount: new Set(observed.map((annotation) => annotation.raterId)).size,
    expectedAnnotationCount,
    observedAnnotationCount,
    missingAnnotationCount,
    missingRate: percentage(missingAnnotationCount, expectedAnnotationCount),
    meanHumanRating:
      observed.length === 0
        ? null
        : round(mean(observed.map((annotation) => annotation.rating))),
    localScoreMean:
      comparisons.length === 0
        ? null
        : round(mean(comparisons.map((comparison) => comparison.localScore))),
    comparisonCaseCount: comparisons.length,
    meanAbsoluteError:
      comparisons.length === 0
        ? null
        : round(
            mean(comparisons.map((comparison) => comparison.absoluteError)),
          ),
    signedBias:
      comparisons.length === 0
        ? null
        : round(mean(comparisons.map((comparison) => comparison.signedBias))),
  };
}

function calculateKrippendorffAlpha(
  ratingsByCase: Map<string, OrdinalValidationRating[]>,
): number | null {
  const comparableUnits = [...ratingsByCase.values()].filter(
    (ratings) => ratings.length >= 2,
  );

  if (comparableUnits.length < 2) {
    return null;
  }

  let observedDifference = 0;
  let observationCount = 0;

  // Coincidence weighting gives every rating one unit of marginal weight even
  // when different cases have different numbers of non-missing raters.
  for (const ratings of comparableUnits) {
    observationCount += ratings.length;

    for (let first = 0; first < ratings.length; first += 1) {
      for (let second = 0; second < ratings.length; second += 1) {
        if (first !== second) {
          observedDifference +=
            squaredRankDistance(ratings[first], ratings[second]) /
            (ratings.length - 1);
        }
      }
    }
  }

  const allRatings = comparableUnits.flat();
  let expectedDifference = 0;

  for (let first = 0; first < allRatings.length; first += 1) {
    for (let second = 0; second < allRatings.length; second += 1) {
      if (first !== second) {
        expectedDifference += squaredRankDistance(
          allRatings[first],
          allRatings[second],
        );
      }
    }
  }

  const observedDisagreement = observedDifference / observationCount;
  const expectedDisagreement =
    expectedDifference / (allRatings.length * (allRatings.length - 1));

  if (expectedDisagreement === 0) {
    return null;
  }

  return round(1 - observedDisagreement / expectedDisagreement);
}

function squaredRankDistance(
  first: OrdinalValidationRating,
  second: OrdinalValidationRating,
) {
  return (first - second) ** 2;
}

function cloneDefinition(
  id: CalibratedMeasurementId,
): BlindedMeasurementPrompt {
  const definition = VALIDATION_MEASUREMENT_DEFINITIONS[id];

  return {
    id,
    name: { ...definition.name },
    operationalDefinition: { ...definition.operationalDefinition },
    anchors: definition.anchors.map((anchor) => ({ ...anchor })),
  };
}

function cloneFeedItem(item: FeedItem): FeedItem {
  return {
    ...item,
    metadata:
      item.metadata === undefined ? undefined : structuredClone(item.metadata),
  };
}

function isLanguage(value: unknown): value is CalibrationLanguage {
  return value === "en" || value === "zh" || value === "mixed";
}

function isPageType(value: unknown): value is ValidationPageType {
  return (
    value === "home" ||
    value === "watch" ||
    value === "search" ||
    value === "shorts"
  );
}

function isOpaqueRaterId(value: unknown): value is string {
  return isString(value) && raterIdPattern.test(value);
}

function isRating(
  value: unknown,
): value is OrdinalValidationRating | null {
  return (
    value === null ||
    (Number.isInteger(value) &&
      isFiniteNumber(value) &&
      value >= 0 &&
      value <= 4)
  );
}

function isBoundedScore(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    isString(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    return invalid(`${label} must be unique`);
  }
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentage(part: number, total: number) {
  return total === 0 ? 0 : round((part / total) * 100);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function invalid(message: string): never {
  throw new Error(`Invalid measurement validation study: ${message}.`);
}
