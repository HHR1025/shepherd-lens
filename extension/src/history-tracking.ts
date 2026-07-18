import type { AttentionSignalSummary } from "./attention-signals";
import { calculateAttentionSignals } from "./attention-signals";
import type { FeedItem } from "./feed-item";
import { normalizeKey } from "./feed-item";
import {
  isAttentionSignalSummary,
  isFeedItem,
  isRecord,
  isString,
} from "./runtime-schema";
import type { StorageAreaLike } from "./storage";

export type PageType = "home" | "watch" | "search" | "shorts" | "other";

export type HistorySnapshot = {
  id: string;
  timestamp: string;
  url: string;
  pageType: PageType;
  feedItems: FeedItem[];
  signals: AttentionSignalSummary;
  feedKey: string;
};

export type HistoryState = {
  version: typeof HISTORY_SCHEMA_VERSION;
  snapshots: HistorySnapshot[];
};

export type HistoryStatus = {
  snapshotCount: number;
  lastSnapshotAt: string | null;
};

export type { StorageAreaLike } from "./storage";

export const HISTORY_STORAGE_KEY = "shepherdLensHistory";
export const HISTORY_SCHEMA_VERSION = 1 as const;
export const MAX_HISTORY_SNAPSHOTS = 100;
export const MIN_SNAPSHOT_INTERVAL_MS = 60_000;

export function createEmptyHistoryState(): HistoryState {
  return {
    version: HISTORY_SCHEMA_VERSION,
    snapshots: [],
  };
}

export function detectPageType(urlValue: string): PageType {
  try {
    const url = new URL(urlValue);

    if (url.pathname === "/") {
      return "home";
    }

    if (url.pathname === "/watch") {
      return "watch";
    }

    if (url.pathname === "/results") {
      return "search";
    }

    if (url.pathname.startsWith("/shorts/")) {
      return "shorts";
    }

    return "other";
  } catch {
    return "other";
  }
}

export function createFeedKey(feedItems: FeedItem[]) {
  return feedItems.map((item) => normalizeKey(item)).sort().join("|");
}

export function createHistorySnapshot(
  feedItems: FeedItem[],
  url: string,
  now = new Date(),
): HistorySnapshot | null {
  if (feedItems.length === 0) {
    return null;
  }

  const timestamp = now.toISOString();
  const feedKey = createFeedKey(feedItems);

  return {
    id: `${now.getTime()}-${Math.abs(hashString(feedKey))}`,
    timestamp,
    url,
    pageType: detectPageType(url),
    feedItems,
    signals: calculateAttentionSignals(feedItems),
    feedKey,
  };
}

export function shouldSaveSnapshot(
  existingSnapshots: HistorySnapshot[],
  nextSnapshot: HistorySnapshot | null,
  now = new Date(),
  minIntervalMs = MIN_SNAPSHOT_INTERVAL_MS,
) {
  if (!nextSnapshot) {
    return false;
  }

  const latest = existingSnapshots.at(-1);

  if (!latest) {
    return true;
  }

  if (latest.feedKey === nextSnapshot.feedKey) {
    return false;
  }

  const latestTime = Date.parse(latest.timestamp);

  if (Number.isFinite(latestTime) && now.getTime() - latestTime < minIntervalMs) {
    return false;
  }

  return true;
}

export function trimSnapshots(
  snapshots: HistorySnapshot[],
  maxSnapshots = MAX_HISTORY_SNAPSHOTS,
) {
  return snapshots.slice(Math.max(0, snapshots.length - maxSnapshots));
}

export function getHistoryStatus(history: HistoryState): HistoryStatus {
  const latest = history.snapshots.at(-1);

  return {
    snapshotCount: history.snapshots.length,
    lastSnapshotAt: latest?.timestamp ?? null,
  };
}

export async function readHistory(storage: StorageAreaLike): Promise<HistoryState> {
  const result = await storage.get([HISTORY_STORAGE_KEY]);
  const rawHistory = result[HISTORY_STORAGE_KEY];

  if (isHistoryState(rawHistory)) {
    return rawHistory;
  }

  if (isLegacyHistoryState(rawHistory)) {
    return {
      version: HISTORY_SCHEMA_VERSION,
      snapshots: rawHistory.snapshots,
    };
  }

  return createEmptyHistoryState();
}

export async function saveHistorySnapshot(
  storage: StorageAreaLike,
  feedItems: FeedItem[],
  url: string,
  now = new Date(),
) {
  const history = await readHistory(storage);
  const nextSnapshot = createHistorySnapshot(feedItems, url, now);

  if (!shouldSaveSnapshot(history.snapshots, nextSnapshot, now)) {
    return {
      history,
      saved: false,
      status: getHistoryStatus(history),
    };
  }

  const nextHistory = {
    version: HISTORY_SCHEMA_VERSION,
    snapshots: trimSnapshots([...history.snapshots, nextSnapshot as HistorySnapshot]),
  } satisfies HistoryState;

  await storage.set({
    [HISTORY_STORAGE_KEY]: nextHistory,
  });

  return {
    history: nextHistory,
    saved: true,
    status: getHistoryStatus(nextHistory),
  };
}

function isHistoryState(value: unknown): value is HistoryState {
  return (
    isRecord(value) &&
    value.version === HISTORY_SCHEMA_VERSION &&
    Array.isArray(value.snapshots) &&
    value.snapshots.every(isHistorySnapshot)
  );
}

function isLegacyHistoryState(
  value: unknown,
): value is Omit<HistoryState, "version"> {
  return (
    isRecord(value) &&
    value.version === undefined &&
    Array.isArray(value.snapshots) &&
    value.snapshots.every(isHistorySnapshot)
  );
}

function isHistorySnapshot(value: unknown): value is HistorySnapshot {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.timestamp) &&
    Number.isFinite(Date.parse(value.timestamp)) &&
    isString(value.url) &&
    isPageType(value.pageType) &&
    Array.isArray(value.feedItems) &&
    value.feedItems.every(isFeedItem) &&
    isAttentionSignalSummary(value.signals) &&
    isString(value.feedKey)
  );
}

function isPageType(value: unknown): value is PageType {
  return (
    value === "home" ||
    value === "watch" ||
    value === "search" ||
    value === "shorts" ||
    value === "other"
  );
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return hash;
}
