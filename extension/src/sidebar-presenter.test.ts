import { describe, expect, it } from "vitest";
import type { AttentionSignal } from "./attention-signals";
import type { DriftComparison } from "./drift-comparison";
import { getCopy } from "./localization";
import {
  formatDriftSummary,
  formatExperimentDeltas,
  formatSnapshotCount,
  getAttentionClimate,
  getFeedDiversity,
  getExperimentCopy,
  uniqueValues,
} from "./sidebar-presenter";

function signal(id: string, value: number): AttentionSignal {
  return {
    id,
    label: id,
    value,
    level: value >= 67 ? "high" : value >= 34 ? "moderate" : "low",
    evidence: "test",
  };
}

describe("sidebar presenter", () => {
  it("maps attention and diversity scores to localized summaries", () => {
    const copy = getCopy("en");

    expect(
      getAttentionClimate(
        [signal("stimulation", 80), signal("conflict", 60)],
        copy,
      ),
    ).toBe(copy.overview.active);
    expect(
      getFeedDiversity(
        {
          itemCount: 2,
          metrics: [
            { id: "visible_feed_entropy", label: "", value: 30, level: "low", evidence: [] },
            { id: "source_diversity", label: "", value: 40, level: "moderate", evidence: [] },
          ],
        },
        copy,
      ),
    ).toBe(copy.levels.moderate);
  });

  it("formats drift summaries in English and Chinese", () => {
    const comparison = {
      baselineAvailable: true,
      baselineTimestamp: "2026-07-18T20:00:00.000Z",
      summary: "",
      changes: [
        {
          id: "stimulation",
          label: "Stimulation",
          current: 80,
          previous: 50,
          delta: 30,
          direction: "rising",
        },
      ],
      repeatedChannels: [],
      repeatedTopics: [],
    } satisfies DriftComparison;

    expect(formatDriftSummary(comparison, "en")).toContain("rising");
    expect(formatDriftSummary(comparison, "zh")).toBe("刺激上升");
  });

  it("keeps concise localized experiment and count copy", () => {
    expect(formatSnapshotCount(1, "en")).toBe("1 snapshot");
    expect(formatSnapshotCount(2, "zh")).toBe("2 次快照");
    expect(getExperimentCopy("zh").complete).toBe("完成实验");
  });

  it("deduplicates visible values and limits experiment deltas", () => {
    expect(uniqueValues(["A", "", "A", "B"])).toEqual(["A", "B"]);
    expect(
      formatExperimentDeltas(
        [
          { id: "stimulation", label: "Stimulation", before: 20, after: 30, delta: 10 },
          { id: "conflict", label: "Conflict", before: 20, after: 20, delta: 0 },
        ],
        "en",
      ),
    ).toEqual([{ label: "Stimulation", value: "+10" }]);
  });
});
