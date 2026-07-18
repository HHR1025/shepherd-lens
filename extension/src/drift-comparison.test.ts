import { describe, expect, it } from "vitest";
import { calculateAttentionSignals } from "./attention-signals";
import {
  compareFeedDrift,
  directionForDelta,
  findRepeatedChannels,
  findRepeatedTopics,
} from "./drift-comparison";
import type { FeedItem } from "./feed-item";
import type { HistorySnapshot } from "./history-tracking";

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    title: "Calm travel guide",
    channel: "Travel Notes",
    description: "",
    duration: "12:00",
    url: "https://www.youtube.com/watch?v=default",
    ...overrides,
  };
}

function snapshot(items: FeedItem[], timestamp = "2026-06-03T00:00:00.000Z"): HistorySnapshot {
  return {
    id: timestamp,
    timestamp,
    url: "https://www.youtube.com/",
    pageType: "home",
    feedItems: items,
    signals: calculateAttentionSignals(items),
    feedKey: items.map((feedItem) => feedItem.url).sort().join("|"),
  };
}

describe("drift comparison", () => {
  it("maps small deltas to steady changes", () => {
    expect(directionForDelta(12)).toBe("rising");
    expect(directionForDelta(-12)).toBe("falling");
    expect(directionForDelta(4)).toBe("steady");
  });

  it("returns a waiting state when no baseline exists", () => {
    const comparison = compareFeedDrift([item()], []);

    expect(comparison.baselineAvailable).toBe(false);
    expect(comparison.summary).toBe("waiting for history");
  });

  it("compares current signals with the latest usable snapshot", () => {
    const previous = [
      item({ title: "Quiet museum walk", url: "https://www.youtube.com/watch?v=a" }),
      item({ title: "Soft city guide", url: "https://www.youtube.com/watch?v=b" }),
    ];
    const current = [
      item({ title: "BREAKING insane mega travel warning!!! 2026", url: "https://www.youtube.com/watch?v=c" }),
      item({ title: "Biggest shocking airport mistake exposed", url: "https://www.youtube.com/watch?v=d" }),
    ];
    const comparison = compareFeedDrift(current, [snapshot(previous)]);
    const stimulation = comparison.changes.find((change) => change.id === "stimulation");

    expect(comparison.baselineAvailable).toBe(true);
    expect(stimulation?.direction).toBe("rising");
    expect(stimulation?.delta).toBeGreaterThan(0);
  });

  it("detects repeated channels across current and previous feeds", () => {
    expect(
      findRepeatedChannels(
        [item({ channel: "Travel Notes" }), item({ channel: "City Archive" })],
        [item({ channel: "Travel Notes" })],
      ),
    ).toEqual(["Travel Notes"]);
  });

  it("detects repeated local title topics", () => {
    expect(
      findRepeatedTopics(
        [item({ title: "Athens travel mistakes before visiting Greece" })],
        [item({ title: "Athens city guide for first time visitors" })],
      ),
    ).toContain("athens");
  });

  it("avoids comparing against an identical latest snapshot", () => {
    const current = [item({ url: "https://www.youtube.com/watch?v=current" })];
    const previous = [item({ url: "https://www.youtube.com/watch?v=previous" })];
    const comparison = compareFeedDrift(current, [
      snapshot(previous, "2026-06-03T00:00:00.000Z"),
      snapshot(current, "2026-06-03T00:01:00.000Z"),
    ]);

    expect(comparison.baselineTimestamp).toBe("2026-06-03T00:00:00.000Z");
  });
});
