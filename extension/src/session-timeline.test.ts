import { describe, expect, it } from "vitest";
import { calculateAttentionSignals } from "./attention-signals";
import type { FeedItem } from "./feed-item";
import type { HistorySnapshot } from "./history-tracking";
import {
  analyzeSessionTimeline,
  calculateFeedSimilarity,
  calculateNoveltyDecay,
  calculateTopicSwitchingSpeed,
  findRecurringChannels,
  findRecurringTopics,
} from "./session-timeline";

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

function snapshot(
  items: FeedItem[],
  timestamp = "2026-06-03T00:00:00.000Z",
): HistorySnapshot {
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

describe("session timeline", () => {
  it("calculates feed similarity from shared recommendations", () => {
    const first = [
      item({ url: "https://www.youtube.com/watch?v=a" }),
      item({ url: "https://www.youtube.com/watch?v=b" }),
    ];
    const second = [
      item({ url: "https://www.youtube.com/watch?v=a" }),
      item({ url: "https://www.youtube.com/watch?v=c" }),
    ];

    expect(calculateFeedSimilarity(first, second)).toBe(33);
  });

  it("detects fast topic switching between unrelated adjacent titles", () => {
    const speed = calculateTopicSwitchingSpeed([
      item({ title: "Athens travel guide" }),
      item({ title: "Quantum physics documentary" }),
      item({ title: "Football transfer news" }),
    ]);

    expect(speed).toBeGreaterThan(80);
  });

  it("detects novelty decay from repeated titles and topics", () => {
    const historical = [
      item({ title: "Athens travel mistakes", url: "https://www.youtube.com/watch?v=a" }),
      item({ title: "Athens city guide", url: "https://www.youtube.com/watch?v=b" }),
    ];
    const current = [
      item({ title: "Athens travel mistakes", url: "https://www.youtube.com/watch?v=a" }),
      item({ title: "Athens weekend guide", url: "https://www.youtube.com/watch?v=c" }),
    ];

    expect(calculateNoveltyDecay(current, historical)).toBeGreaterThan(40);
  });

  it("finds recurring channels from current and historical feeds", () => {
    expect(
      findRecurringChannels(
        [item({ channel: "Travel Notes" }), item({ channel: "City Archive" })],
        [item({ channel: "Travel Notes" }), item({ channel: "Travel Notes" })],
      ),
    ).toEqual(["Travel Notes"]);
  });

  it("finds recurring topics from current and historical feeds", () => {
    expect(
      findRecurringTopics(
        [item({ title: "Athens travel guide" })],
        [item({ title: "Athens city walk" }), item({ title: "Prague travel guide" })],
      ),
    ).toEqual(["athens", "guide", "travel"]);
  });

  it("summarizes recent session timeline signals", () => {
    const current = [
      item({
        title: "Athens travel guide",
        channel: "Travel Notes",
        url: "https://www.youtube.com/watch?v=c",
      }),
      item({
        title: "Prague travel guide",
        channel: "City Archive",
        url: "https://www.youtube.com/watch?v=d",
      }),
    ];
    const history = [
      snapshot(
        [
          item({
            title: "Athens city walk",
            channel: "Travel Notes",
            url: "https://www.youtube.com/watch?v=a",
          }),
        ],
        "2026-06-03T00:00:00.000Z",
      ),
      snapshot(
        [
          item({
            title: "Prague city walk",
            channel: "City Archive",
            url: "https://www.youtube.com/watch?v=b",
          }),
        ],
        "2026-06-03T00:10:00.000Z",
      ),
    ];
    const summary = analyzeSessionTimeline(current, history);

    expect(summary.snapshotCount).toBe(2);
    expect(summary.activeSessionSnapshots).toBe(2);
    expect(summary.recurringChannels).toEqual(["City Archive", "Travel Notes"]);
    expect(summary.recurringTopics).toContain("athens");
    expect(summary.topicSwitchingSpeed).toBeGreaterThan(0);
  });
});
