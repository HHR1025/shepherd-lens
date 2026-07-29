import { describe, expect, it } from "vitest";
import { calculateAttentionSignals } from "./attention-signals";
import type { FeedItem } from "./feed-item";
import type { HistorySnapshot } from "./history-tracking";
import { assessObservationQuality } from "./observation-quality";

function item(index: number): FeedItem {
  return {
    title: `Visible recommendation ${index}`,
    channel: `Channel ${index}`,
    description: "",
    duration: "10:00",
    url: `https://www.youtube.com/watch?v=${index}`,
  };
}

function items(count: number) {
  return Array.from({ length: count }, (_, index) => item(index));
}

function snapshot(timestamp: string, index: number): HistorySnapshot {
  const feedItems = [item(index)];

  return {
    id: `${timestamp}-${index}`,
    timestamp,
    url: "https://www.youtube.com/",
    pageType: "home",
    feedItems,
    signals: calculateAttentionSignals(feedItems),
    feedKey: feedItems[0].url,
  };
}

const now = new Date("2026-07-29T12:00:00.000Z");

describe("observation quality", () => {
  it("labels an unobserved empty page as a weak signal", () => {
    const quality = assessObservationQuality({
      feedItems: [],
      history: { version: 1, snapshots: [] },
      observedAt: null,
      url: "https://www.youtube.com/",
      now,
    });

    expect(quality).toMatchObject({
      boundary: "weak_signal",
      extractionFreshness: "waiting",
      extractionHealth: "waiting",
      historyDepth: "none",
      historyRecency: "none",
      pageType: "home",
      sampleQuality: "insufficient",
    });
  });

  it("keeps a narrow visible sample within the weak-signal boundary", () => {
    const quality = assessObservationQuality({
      feedItems: items(4),
      history: { version: 1, snapshots: [] },
      observedAt: "2026-07-29T11:59:00.000Z",
      url: "https://www.youtube.com/results?search_query=travel",
      now,
    });

    expect(quality.boundary).toBe("weak_signal");
    expect(quality.sampleQuality).toBe("insufficient");
    expect(quality.extractionHealth).toBe("observed");
    expect(quality.pageType).toBe("search");
  });

  it("labels a usable single-page sample as a page snapshot", () => {
    const quality = assessObservationQuality({
      feedItems: items(6),
      history: { version: 1, snapshots: [] },
      observedAt: "2026-07-29T11:59:00.000Z",
      url: "https://www.youtube.com/watch?v=abc",
      now,
    });

    expect(quality.boundary).toBe("page_snapshot");
    expect(quality.sampleQuality).toBe("narrow");
    expect(quality.pageType).toBe("watch");
  });

  it("requires recent same-session history before showing a session trend", () => {
    const quality = assessObservationQuality({
      feedItems: items(6),
      history: {
        version: 1,
        snapshots: [
          snapshot("2026-07-29T11:35:00.000Z", 20),
          snapshot("2026-07-29T11:50:00.000Z", 21),
        ],
      },
      observedAt: "2026-07-29T11:59:00.000Z",
      url: "https://www.youtube.com/shorts/abc",
      now,
    });

    expect(quality).toMatchObject({
      activeSessionSnapshots: 2,
      boundary: "session_trend",
      historyDepth: "shallow",
      historyRecency: "recent",
      pageType: "shorts",
    });
  });

  it("does not present stale history as a current session trend", () => {
    const quality = assessObservationQuality({
      feedItems: items(12),
      history: {
        version: 1,
        snapshots: [
          snapshot("2026-07-27T11:30:00.000Z", 20),
          snapshot("2026-07-27T11:45:00.000Z", 21),
          snapshot("2026-07-27T11:50:00.000Z", 22),
        ],
      },
      observedAt: "2026-07-29T11:59:00.000Z",
      url: "https://www.youtube.com/",
      now,
    });

    expect(quality.boundary).toBe("page_snapshot");
    expect(quality.historyDepth).toBe("established");
    expect(quality.historyRecency).toBe("stale");
    expect(quality.sampleQuality).toBe("adequate");
  });

  it("downgrades stale extraction to a weak signal", () => {
    const quality = assessObservationQuality({
      feedItems: items(12),
      history: { version: 1, snapshots: [] },
      observedAt: "2026-07-29T11:50:00.000Z",
      url: "not a url",
      now,
    });

    expect(quality.boundary).toBe("weak_signal");
    expect(quality.extractionFreshness).toBe("stale");
    expect(quality.pageType).toBe("other");
  });
});
