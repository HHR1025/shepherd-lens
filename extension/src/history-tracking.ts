import type { AttentionSignalSummary } from "./attention-signals";
import { calculateAttentionSignals } from "./attention-signals";
import type { FeedItem } from "./feed-item";
import { normalizeKey } from "./feed-item";

export type PageType = "home" | "watch" | "shorts" | "other";

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
  snapshots: HistorySnapshot[];
};

export type HistoryStatus = {
  snapshotCount: number;
  lastSnapshotAt: string | null;
};

export type StorageAreaLike = {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

export const HISTORY_STORAGE_KEY = "shepherdLensHistory";
export const MAX_HISTORY_SNAPSHOTS = 100;
export const MIN_SNAPSHOT_INTERVAL_MS = 60_000;

export function detectPageType(urlValue: string): PageType {
  try {
    const url = new URL(urlValue);

    if (url.pathname === "/") {
      return "home";
    }

    if (url.pathname === "/watch") {
      return "watch";
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

  if (!isHistoryState(rawHistory)) {
    return { snapshots: [] };
  }

  return rawHistory;
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
    snapshots: trimSnapshots([...history.snapshots, nextSnapshot as HistorySnapshot]),
  };

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
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as HistoryState).snapshots)
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
