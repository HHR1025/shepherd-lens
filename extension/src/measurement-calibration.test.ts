import { describe, expect, it } from "vitest";
import { MEASUREMENT_CALIBRATION_CORPUS } from "./measurement-calibration-corpus";
import {
  ALL_CALIBRATED_MEASUREMENT_IDS,
  runMeasurementCalibration,
  validateCalibrationCorpus,
} from "./measurement-calibration";

describe("measurement calibration baseline", () => {
  it("validates a versioned corpus covering every current measurement", () => {
    const corpus = validateCalibrationCorpus(MEASUREMENT_CALIBRATION_CORPUS);
    const representedIds = new Set(
      corpus.cases.flatMap((calibrationCase) =>
        Object.keys(calibrationCase.expected),
      ),
    );

    expect(corpus.version).toBe(1);
    expect(corpus.cases.length).toBeGreaterThanOrEqual(10);
    expect([...representedIds].sort()).toEqual(
      [...ALL_CALIBRATED_MEASUREMENT_IDS].sort(),
    );
  });

  it("reports every bounded expectation and currently passes the baseline", () => {
    const report = runMeasurementCalibration(MEASUREMENT_CALIBRATION_CORPUS);
    const failures = report.cases.flatMap((calibrationCase) =>
      calibrationCase.measurements
        .filter((measurement) => !measurement.passed)
        .map((measurement) => ({
          caseId: calibrationCase.id,
          measurementId: measurement.id,
          actual: measurement.actual,
          expected: measurement.expected,
        })),
    );

    expect(report.caseCount).toBe(MEASUREMENT_CALIBRATION_CORPUS.cases.length);
    expect(report.expectationCount).toBeGreaterThanOrEqual(20);
    expect(failures).toEqual([]);
    expect(report.failedExpectationCount).toBe(0);
    expect(report.passedExpectationCount).toBe(report.expectationCount);
    expect(report.passRate).toBe(100);
    expect(report.cases.every((result) => result.passed)).toBe(true);
  });

  it("keeps paired English and Chinese intensity ordering explicit", () => {
    const report = runMeasurementCalibration(MEASUREMENT_CALIBRATION_CORPUS);

    expect(actualValue(report, "hook-heavy-en", "stimulation")).toBeGreaterThan(
      actualValue(report, "calm-en", "stimulation"),
    );
    expect(actualValue(report, "hook-heavy-zh", "stimulation")).toBeGreaterThan(
      actualValue(report, "calm-zh", "stimulation"),
    );
    expect(actualValue(report, "conflict-heavy-zh", "conflict")).toBeGreaterThan(
      actualValue(report, "calm-zh", "conflict"),
    );
  });

  it("returns a deterministic structured report", () => {
    expect(runMeasurementCalibration(MEASUREMENT_CALIBRATION_CORPUS)).toEqual(
      runMeasurementCalibration(MEASUREMENT_CALIBRATION_CORPUS),
    );
  });

  it.each([
    {
      name: "unknown measurement id",
      mutate: (corpus: unknown) => {
        const value = corpus as MutableCorpus;
        value.cases[0].expected.unknown_metric = {
          min: 0,
          max: 10,
          rationale: "not registered",
        };
      },
    },
    {
      name: "reversed range",
      mutate: (corpus: unknown) => {
        const value = corpus as MutableCorpus;
        value.cases[0].expected.stimulation = {
          min: 80,
          max: 20,
          rationale: "invalid range",
        };
      },
    },
    {
      name: "out-of-bounds range",
      mutate: (corpus: unknown) => {
        const value = corpus as MutableCorpus;
        value.cases[0].expected.stimulation = {
          min: -1,
          max: 101,
          rationale: "invalid bounds",
        };
      },
    },
    {
      name: "empty rationale",
      mutate: (corpus: unknown) => {
        const value = corpus as MutableCorpus;
        value.cases[0].expected.stimulation.rationale = "";
      },
    },
  ])("rejects malformed calibration fixtures: $name", ({ mutate }) => {
    const malformed = structuredClone(MEASUREMENT_CALIBRATION_CORPUS) as unknown;
    mutate(malformed);

    expect(() => validateCalibrationCorpus(malformed)).toThrow(
      /calibration corpus/i,
    );
  });
});

type MutableCorpus = {
  cases: Array<{
    expected: Record<
      string,
      { min: number; max: number; rationale: string }
    >;
  }>;
};

function actualValue(
  report: ReturnType<typeof runMeasurementCalibration>,
  caseId: string,
  measurementId: string,
) {
  const calibrationCase = report.cases.find((result) => result.id === caseId);
  const measurement = calibrationCase?.measurements.find(
    (result) => result.id === measurementId,
  );

  if (!measurement) {
    throw new Error(`Missing ${measurementId} result for ${caseId}.`);
  }

  return measurement.actual;
}
