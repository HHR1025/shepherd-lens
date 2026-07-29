import type { FeedItem } from "./feed-item";
import {
  detectPageType,
  type HistoryState,
  type PageType,
} from "./history-tracking";
import { analyzeSessionTimeline } from "./session-timeline";

export type ObservationBoundary =
  | "weak_signal"
  | "page_snapshot"
  | "session_trend";
export type SampleQuality = "insufficient" | "narrow" | "adequate";
export type HistoryDepth = "none" | "shallow" | "established";
export type Recency = "none" | "recent" | "stale";
export type ExtractionFreshness = "waiting" | "fresh" | "stale";
export type ExtractionHealth = "waiting" | "observed" | "empty";

export type ObservationQuality = {
  activeSessionSnapshots: number;
  boundary: ObservationBoundary;
  extractionFreshness: ExtractionFreshness;
  extractionHealth: ExtractionHealth;
  historyDepth: HistoryDepth;
  historyRecency: Recency;
  pageType: PageType;
  sampleQuality: SampleQuality;
  snapshotCount: number;
  visibleItemCount: number;
};

export type ObservationQualityInput = {
  feedItems: FeedItem[];
  history: HistoryState;
  observedAt: string | null;
  url: string;
  now?: Date;
};

const MIN_USABLE_SAMPLE = 5;
const MIN_ADEQUATE_SAMPLE = 12;
const MIN_SESSION_SNAPSHOTS = 2;
const FRESH_EXTRACTION_MS = 5 * 60 * 1000;
const RECENT_HISTORY_MS = 24 * 60 * 60 * 1000;

export function assessObservationQuality({
  feedItems,
  history,
  observedAt,
  url,
  now = new Date(),
}: ObservationQualityInput): ObservationQuality {
  const visibleItemCount = feedItems.length;
  const snapshotCount = history.snapshots.length;
  const timeline = analyzeSessionTimeline(feedItems, history.snapshots);
  const sampleQuality = getSampleQuality(visibleItemCount);
  const extractionFreshness = getExtractionFreshness(observedAt, now);
  const extractionHealth = getExtractionHealth(observedAt, visibleItemCount);
  const historyRecency = getHistoryRecency(
    history.snapshots.at(-1)?.timestamp ?? null,
    now,
  );
  const historyDepth = getHistoryDepth(snapshotCount);
  const boundary = getObservationBoundary({
    activeSessionSnapshots: timeline.activeSessionSnapshots,
    extractionFreshness,
    extractionHealth,
    historyRecency,
    sampleQuality,
  });

  return {
    activeSessionSnapshots: timeline.activeSessionSnapshots,
    boundary,
    extractionFreshness,
    extractionHealth,
    historyDepth,
    historyRecency,
    pageType: detectPageType(url),
    sampleQuality,
    snapshotCount,
    visibleItemCount,
  };
}

function getSampleQuality(itemCount: number): SampleQuality {
  if (itemCount < MIN_USABLE_SAMPLE) {
    return "insufficient";
  }

  if (itemCount < MIN_ADEQUATE_SAMPLE) {
    return "narrow";
  }

  return "adequate";
}

function getHistoryDepth(snapshotCount: number): HistoryDepth {
  if (snapshotCount === 0) {
    return "none";
  }

  return snapshotCount < 3 ? "shallow" : "established";
}

function getHistoryRecency(timestamp: string | null, now: Date): Recency {
  if (!timestamp) {
    return "none";
  }

  return elapsedMs(timestamp, now) <= RECENT_HISTORY_MS ? "recent" : "stale";
}

function getExtractionFreshness(
  observedAt: string | null,
  now: Date,
): ExtractionFreshness {
  if (!observedAt) {
    return "waiting";
  }

  return elapsedMs(observedAt, now) <= FRESH_EXTRACTION_MS ? "fresh" : "stale";
}

function getExtractionHealth(
  observedAt: string | null,
  itemCount: number,
): ExtractionHealth {
  if (!observedAt) {
    return "waiting";
  }

  return itemCount > 0 ? "observed" : "empty";
}

function getObservationBoundary({
  activeSessionSnapshots,
  extractionFreshness,
  extractionHealth,
  historyRecency,
  sampleQuality,
}: {
  activeSessionSnapshots: number;
  extractionFreshness: ExtractionFreshness;
  extractionHealth: ExtractionHealth;
  historyRecency: Recency;
  sampleQuality: SampleQuality;
}): ObservationBoundary {
  if (
    sampleQuality === "insufficient" ||
    extractionFreshness !== "fresh" ||
    extractionHealth !== "observed"
  ) {
    return "weak_signal";
  }

  if (
    activeSessionSnapshots >= MIN_SESSION_SNAPSHOTS &&
    historyRecency === "recent"
  ) {
    return "session_trend";
  }

  return "page_snapshot";
}

function elapsedMs(timestamp: string, now: Date) {
  const parsed = Date.parse(timestamp);

  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, now.getTime() - parsed);
}
