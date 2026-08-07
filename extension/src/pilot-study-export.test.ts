import { describe, expect, it } from "vitest";
import { calculateAttentionSignals } from "./attention-signals";
import type { FeedItem } from "./feed-item";
import {
  createEmptyHistoryState,
  createHistorySnapshot,
  type HistoryState,
} from "./history-tracking";
import {
  createPilotExportBundle,
  MAX_PILOT_CASES,
  MAX_PILOT_ITEMS_PER_CASE,
  pilotExportFilename,
  serializePilotExportBundle,
} from "./pilot-study-export";

function item(index = 0, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    title: `Visible recommendation ${index}`,
    channel: `Channel ${index}`,
    description: `Sensitive free text ${index}`,
    duration: "12:00",
    url: `https://www.youtube.com/watch?v=private-${index}`,
    id: `private-${index}`,
    platform: "youtube",
    timestamp: "2026-08-01T12:34:56.000Z",
    metadata: { tracking: `private-${index}` },
    ...overrides,
  };
}

describe("pilot study export", () => {
  it("requires explicit confirmation", () => {
    expect(() =>
      createPilotExportBundle({
        consentConfirmed: false,
        createdAt: new Date("2026-08-07T10:00:00.000Z"),
        currentFeedItems: [item()],
        currentObservedAt: "2026-08-07T09:00:00.000Z",
        currentUrl: "https://www.youtube.com/",
        history: createEmptyHistoryState(),
      }),
    ).toThrow("explicit confirmation");
  });

  it("separates coordinator measurements from a redacted blinded packet", () => {
    const history = historyWithSnapshots(2);
    const bundle = createPilotExportBundle({
      consentConfirmed: true,
      createdAt: new Date("2026-08-07T10:00:00.000Z"),
      currentFeedItems: [
        item(10, { title: "震惊：城市交通冲突真相" }),
        item(11, { title: "Quiet city walking tour" }),
      ],
      currentObservedAt: "2026-08-07T09:47:31.000Z",
      currentUrl: "https://www.youtube.com/watch?v=private-current",
      history,
    });
    const serialized = JSON.stringify(bundle);

    expect(bundle.consent).toEqual({
      confirmed: true,
      noticeVersion: 1,
      scope: "local-user-initiated-export",
    });
    expect(bundle.coordinator.cases).toHaveLength(3);
    expect(bundle.coordinator.cases.at(-1)).toMatchObject({
      language: "mixed",
      observedOn: "2026-08-07",
      pageType: "watch",
    });
    expect(
      Object.keys(bundle.coordinator.cases[0].localMeasurements).length,
    ).toBe(10);
    expect(bundle.blinded.cases).toEqual(
      bundle.coordinator.cases.map((studyCase) => ({
        id: studyCase.id,
        language: studyCase.language,
        pageType: studyCase.pageType,
        observedOn: studyCase.observedOn,
        fingerprint: studyCase.fingerprint,
        items: studyCase.items,
      })),
    );
    expect(serialized).not.toContain("youtube.com");
    expect(serialized).not.toContain("Sensitive free text");
    expect(serialized).not.toContain("private-");
    expect(serialized).not.toContain("tracking");
    expect(bundle.blinded).not.toHaveProperty("raterIds");
    expect(bundle.blinded).not.toHaveProperty("annotations");
    expect(bundle.blinded.cases[0]).not.toHaveProperty("localMeasurements");
  });

  it("deduplicates equivalent feeds and applies case and item bounds", () => {
    const duplicate = createHistorySnapshot(
      [item(1)],
      "https://www.youtube.com/",
      new Date("2026-08-01T00:00:00.000Z"),
    )!;
    const history: HistoryState = {
      version: 1,
      snapshots: [
        duplicate,
        { ...duplicate, id: "duplicate", timestamp: "2026-08-02T00:00:00.000Z" },
        ...historyWithSnapshots(MAX_PILOT_CASES + 5).snapshots,
      ],
    };
    const bundle = createPilotExportBundle({
      consentConfirmed: true,
      createdAt: new Date("2026-08-07T10:00:00.000Z"),
      currentFeedItems: Array.from(
        { length: MAX_PILOT_ITEMS_PER_CASE + 5 },
        (_, index) => item(index + 100),
      ),
      currentObservedAt: "2026-08-07T09:00:00.000Z",
      currentUrl: "https://www.youtube.com/",
      history,
    });

    expect(bundle.coordinator.cases.length).toBeLessThanOrEqual(MAX_PILOT_CASES);
    expect(bundle.coordinator.cases.at(-1)?.items).toHaveLength(
      MAX_PILOT_ITEMS_PER_CASE,
    );
    expect(
      new Set(bundle.coordinator.cases.map((studyCase) => studyCase.fingerprint))
        .size,
    ).toBe(bundle.coordinator.cases.length);
  });

  it("is deterministic for identical inputs", () => {
    const input = {
      consentConfirmed: true,
      createdAt: new Date("2026-08-07T10:00:00.000Z"),
      currentFeedItems: [item(1)],
      currentObservedAt: "2026-08-07T09:00:00.000Z",
      currentUrl: "https://www.youtube.com/",
      history: historyWithSnapshots(1),
    } as const;

    const bundle = createPilotExportBundle(input);

    expect(bundle).toEqual(createPilotExportBundle(input));
    expect(pilotExportFilename(bundle)).toBe(
      "shepherd-lens-pilot-20260807.json",
    );
    expect(serializePilotExportBundle(bundle)).toBe(
      `${JSON.stringify(bundle, null, 2)}\n`,
    );
  });
});

function historyWithSnapshots(count: number): HistoryState {
  return {
    version: 1,
    snapshots: Array.from({ length: count }, (_, index) => {
      const feedItems = [item(index, { title: `Historical topic ${index}` })];
      return {
        id: `snapshot-${index}`,
        timestamp: new Date(Date.UTC(2026, 7, 1 + index)).toISOString(),
        url: "https://www.youtube.com/",
        pageType: "home" as const,
        feedItems,
        signals: calculateAttentionSignals(feedItems),
        feedKey: `history-${index}`,
      };
    }),
  };
}
