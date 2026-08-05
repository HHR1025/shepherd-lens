import { calculateAttentionSignals } from "./attention-signals";
import type { FeedItem } from "./feed-item";
import { calculateLocalMeasurements } from "./local-measurements";
import { isFeedItem, isRecord, isString } from "./runtime-schema";

export const MEASUREMENT_CALIBRATION_VERSION = 1 as const;

export const ALL_CALIBRATED_MEASUREMENT_IDS = [
  "stimulation",
  "conflict",
  "novelty",
  "repetition",
  "short_form",
  "channel_concentration",
  "topic_concentration",
  "visible_feed_entropy",
  "source_diversity",
  "title_hook_density",
] as const;

export type CalibratedMeasurementId =
  (typeof ALL_CALIBRATED_MEASUREMENT_IDS)[number];
export type CalibrationLanguage = "en" | "zh" | "mixed";

export type ExpectedMeasurementRange = {
  min: number;
  max: number;
  rationale: string;
};

export type MeasurementCalibrationCase = {
  id: string;
  language: CalibrationLanguage;
  description: string;
  items: FeedItem[];
  expected: Partial<
    Record<CalibratedMeasurementId, ExpectedMeasurementRange>
  >;
};

export type MeasurementCalibrationCorpus = {
  version: typeof MEASUREMENT_CALIBRATION_VERSION;
  provenance: "synthetic-engineering-fixtures";
  cases: MeasurementCalibrationCase[];
};

export type MeasurementCalibrationResult = {
  id: CalibratedMeasurementId;
  actual: number;
  expected: ExpectedMeasurementRange;
  passed: boolean;
};

export type CalibrationCaseResult = {
  id: string;
  language: CalibrationLanguage;
  description: string;
  passed: boolean;
  measurements: MeasurementCalibrationResult[];
};

export type MeasurementCalibrationReport = {
  version: typeof MEASUREMENT_CALIBRATION_VERSION;
  provenance: MeasurementCalibrationCorpus["provenance"];
  caseCount: number;
  expectationCount: number;
  passedExpectationCount: number;
  failedExpectationCount: number;
  passRate: number;
  cases: CalibrationCaseResult[];
};

const measurementIds = new Set<string>(ALL_CALIBRATED_MEASUREMENT_IDS);

export function runMeasurementCalibration(
  corpusValue: unknown,
): MeasurementCalibrationReport {
  const corpus = validateCalibrationCorpus(corpusValue);
  const cases = corpus.cases.map(evaluateCalibrationCase);
  const expectationCount = cases.reduce(
    (total, result) => total + result.measurements.length,
    0,
  );
  const passedExpectationCount = cases.reduce(
    (total, result) =>
      total +
      result.measurements.filter((measurement) => measurement.passed).length,
    0,
  );

  return {
    version: corpus.version,
    provenance: corpus.provenance,
    caseCount: cases.length,
    expectationCount,
    passedExpectationCount,
    failedExpectationCount: expectationCount - passedExpectationCount,
    passRate:
      expectationCount === 0
        ? 0
        : round((passedExpectationCount / expectationCount) * 100),
    cases,
  };
}

export function validateCalibrationCorpus(
  value: unknown,
): MeasurementCalibrationCorpus {
  if (
    !isRecord(value) ||
    value.version !== MEASUREMENT_CALIBRATION_VERSION ||
    value.provenance !== "synthetic-engineering-fixtures" ||
    !Array.isArray(value.cases) ||
    value.cases.length === 0
  ) {
    return invalid("expected a versioned, non-empty synthetic corpus");
  }

  const cases = value.cases.map(validateCalibrationCase);
  const caseIds = cases.map((calibrationCase) => calibrationCase.id);

  if (new Set(caseIds).size !== caseIds.length) {
    return invalid("case ids must be unique");
  }

  return {
    version: MEASUREMENT_CALIBRATION_VERSION,
    provenance: "synthetic-engineering-fixtures",
    cases,
  };
}

function evaluateCalibrationCase(
  calibrationCase: MeasurementCalibrationCase,
): CalibrationCaseResult {
  const attention = calculateAttentionSignals(calibrationCase.items).signals;
  const structure = calculateLocalMeasurements(calibrationCase.items).metrics;
  const actualById = new Map(
    [...attention, ...structure].map((measurement) => [
      measurement.id,
      measurement.value,
    ]),
  );
  const measurements = Object.entries(calibrationCase.expected).map(
    ([id, expected]) => {
      const measurementId = id as CalibratedMeasurementId;
      const actual = actualById.get(measurementId);

      if (actual === undefined) {
        throw new Error(
          `Calibration corpus references unavailable measurement ${measurementId}.`,
        );
      }

      return {
        id: measurementId,
        actual,
        expected,
        passed: actual >= expected.min && actual <= expected.max,
      };
    },
  );

  return {
    id: calibrationCase.id,
    language: calibrationCase.language,
    description: calibrationCase.description,
    passed: measurements.every((measurement) => measurement.passed),
    measurements,
  };
}

function validateCalibrationCase(
  value: unknown,
  index: number,
): MeasurementCalibrationCase {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.id) ||
    !isCalibrationLanguage(value.language) ||
    !isString(value.description) ||
    value.description.trim().length === 0 ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > 20 ||
    !value.items.every(isFeedItem) ||
    !isRecord(value.expected) ||
    Object.keys(value.expected).length === 0
  ) {
    return invalid(`case ${index} has an invalid shape`);
  }

  const caseId = value.id;
  const expectedEntries = Object.entries(value.expected).map(([id, range]) => {
    if (!measurementIds.has(id)) {
      return invalid(`case ${caseId} uses unknown measurement ${id}`);
    }

    return [id, validateExpectedRange(range, caseId, id)] as const;
  });

  return {
    id: caseId,
    language: value.language,
    description: value.description,
    items: value.items,
    expected: Object.fromEntries(expectedEntries),
  };
}

function validateExpectedRange(
  value: unknown,
  caseId: string,
  measurementId: string,
): ExpectedMeasurementRange {
  if (
    !isRecord(value) ||
    !isBoundedScore(value.min) ||
    !isBoundedScore(value.max) ||
    value.min > value.max ||
    !isString(value.rationale) ||
    value.rationale.trim().length === 0
  ) {
    return invalid(`case ${caseId} has an invalid range for ${measurementId}`);
  }

  return {
    min: value.min,
    max: value.max,
    rationale: value.rationale,
  };
}

function isCalibrationLanguage(value: unknown): value is CalibrationLanguage {
  return value === "en" || value === "zh" || value === "mixed";
}

function isBoundedScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function invalid(message: string): never {
  throw new Error(`Invalid measurement calibration corpus: ${message}.`);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
