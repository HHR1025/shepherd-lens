import { describe, expect, it } from "vitest";
import {
  createFeedKey,
  createEmptyHistoryState,
  createHistorySnapshot,
  detectPageType,
  HISTORY_SCHEMA_VERSION,
  MAX_HISTORY_SNAPSHOTS,
  readHistory,
  saveHistorySnapshot,
  shouldSaveSnapshot,
  trimSnapshots,
  type HistoryState,
  type StorageAreaLike,
} from "./history-tracking";
import type { FeedItem } from "./feed-item";
import { UnsupportedStorageSchemaError } from "./storage-schema";

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    title: "Calm city walk",
    channel: "Default Channel",
    description: "",
    duration: "12:00",
    url: "https://www.youtube.com/watch?v=default",
    ...overrides,
  };
}

function memoryStorage(initialHistory?: HistoryState): StorageAreaLike & { data: Record<string, unknown> } {
  const storage: StorageAreaLike & { data: Record<string, unknown> } = {
    data: initialHistory ? { shepherdLensHistory: initialHistory } : {},
    async get(keys: string[]) {
      return Object.fromEntries(keys.map((key) => [key, storage.data[key]]));
    },
    async set(items: Record<string, unknown>) {
      Object.assign(storage.data, items);
    },
  };

  return storage;
}

describe("history tracking", () => {
  it("detects YouTube page types", () => {
    expect(detectPageType("https://www.youtube.com/")).toBe("home");
    expect(detectPageType("https://www.youtube.com/watch?v=abc")).toBe("watch");
    expect(detectPageType("https://www.youtube.com/results?search_query=travel")).toBe("search");
    expect(detectPageType("https://www.youtube.com/shorts/abc")).toBe("shorts");
    expect(detectPageType("not a url")).toBe("other");
  });

  it("creates stable feed keys independent of item order", () => {
    const first = [
      item({ title: "B", url: "https://www.youtube.com/watch?v=b" }),
      item({ title: "A", url: "https://www.youtube.com/watch?v=a" }),
    ];
    const second = [...first].reverse();

    expect(createFeedKey(first)).toBe(createFeedKey(second));
  });

  it("does not create snapshots for empty feeds", () => {
    expect(createHistorySnapshot([], "https://www.youtube.com/")).toBeNull();
  });

  it("creates snapshots with signals", () => {
    const snapshot = createHistorySnapshot(
      [item({ title: "BREAKING city update", duration: "0:58" })],
      "https://www.youtube.com/watch?v=abc",
      new Date("2026-06-03T00:00:00.000Z"),
    );

    expect(snapshot).toMatchObject({
      timestamp: "2026-06-03T00:00:00.000Z",
      pageType: "watch",
      signals: {
        itemCount: 1,
      },
    });
  });

  it("avoids identical snapshots", () => {
    const first = createHistorySnapshot(
      [item()],
      "https://www.youtube.com/",
      new Date("2026-06-03T00:00:00.000Z"),
    );
    const second = createHistorySnapshot(
      [item()],
      "https://www.youtube.com/",
      new Date("2026-06-03T00:05:00.000Z"),
    );

    expect(shouldSaveSnapshot([first!], second, new Date("2026-06-03T00:05:00.000Z"))).toBe(false);
  });

  it("respects the minimum interval", () => {
    const first = createHistorySnapshot(
      [item({ url: "https://www.youtube.com/watch?v=a" })],
      "https://www.youtube.com/",
      new Date("2026-06-03T00:00:00.000Z"),
    );
    const second = createHistorySnapshot(
      [item({ url: "https://www.youtube.com/watch?v=b" })],
      "https://www.youtube.com/",
      new Date("2026-06-03T00:00:30.000Z"),
    );

    expect(shouldSaveSnapshot([first!], second, new Date("2026-06-03T00:00:30.000Z"))).toBe(false);
  });

  it("trims snapshots to the configured cap", () => {
    const snapshots = Array.from({ length: 5 }, (_, index) =>
      createHistorySnapshot(
        [item({ url: `https://www.youtube.com/watch?v=${index}` })],
        "https://www.youtube.com/",
        new Date(1_800_000_000_000 + index),
      ),
    );

    expect(trimSnapshots(snapshots.filter(Boolean) as NonNullable<typeof snapshots[number]>[], 3)).toHaveLength(3);
  });

  it("saves snapshots through the storage adapter", async () => {
    const storage = memoryStorage();
    const result = await saveHistorySnapshot(
      storage,
      [item({ title: "First saved item" })],
      "https://www.youtube.com/",
      new Date("2026-06-03T00:00:00.000Z"),
    );
    const history = await readHistory(storage);

    expect(result.saved).toBe(true);
    expect(history.version).toBe(HISTORY_SCHEMA_VERSION);
    expect(history.snapshots).toHaveLength(1);
  });

  it("rejects oversized direct writes before touching storage", async () => {
    const storage = memoryStorage();

    await expect(
      saveHistorySnapshot(
        storage,
        Array.from({ length: 61 }, () => item()),
        "https://www.youtube.com/",
      ),
    ).rejects.toThrow("Feed items exceed persistence boundaries");
    expect(storage.data).toEqual({});
  });

  it("migrates valid legacy history without discarding snapshots", async () => {
    const storage = memoryStorage();
    const snapshot = createHistorySnapshot(
      [item({ title: "Legacy item" })],
      "https://www.youtube.com/",
      new Date("2026-06-03T00:00:00.000Z"),
    );
    storage.data.shepherdLensHistory = {
      snapshots: [snapshot],
    };

    await expect(readHistory(storage)).resolves.toEqual({
      version: HISTORY_SCHEMA_VERSION,
      snapshots: [snapshot],
    });
  });

  it("rejects unsupported future history versions", async () => {
    const storage = memoryStorage();
    storage.data.shepherdLensHistory = {
      version: HISTORY_SCHEMA_VERSION + 1,
      snapshots: [],
    };

    await expect(readHistory(storage)).rejects.toBeInstanceOf(
      UnsupportedStorageSchemaError,
    );
    await expect(
      saveHistorySnapshot(
        storage,
        [item({ title: "Must not overwrite future data" })],
        "https://www.youtube.com/",
      ),
    ).rejects.toBeInstanceOf(UnsupportedStorageSchemaError);
    expect(storage.data.shepherdLensHistory).toEqual({
      version: HISTORY_SCHEMA_VERSION + 1,
      snapshots: [],
    });
  });

  it("rejects malformed nested snapshot data from storage", async () => {
    const storage = memoryStorage();
    storage.data.shepherdLensHistory = {
      snapshots: [{ timestamp: "not-a-date", feedItems: "invalid" }],
    };

    await expect(readHistory(storage)).resolves.toEqual(createEmptyHistoryState());
  });

  it("rejects stored history that exceeds snapshot and item limits", async () => {
    const storage = memoryStorage();
    const snapshot = createHistorySnapshot(
      [item()],
      "https://www.youtube.com/",
      new Date("2026-06-03T00:00:00.000Z"),
    )!;
    storage.data.shepherdLensHistory = {
      version: HISTORY_SCHEMA_VERSION,
      snapshots: Array.from(
        { length: MAX_HISTORY_SNAPSHOTS + 1 },
        (_, index) => ({ ...snapshot, id: `snapshot-${index}` }),
      ),
    };

    await expect(readHistory(storage)).resolves.toEqual(createEmptyHistoryState());

    storage.data.shepherdLensHistory = {
      version: HISTORY_SCHEMA_VERSION,
      snapshots: [{
        ...snapshot,
        feedItems: Array.from({ length: 61 }, () => item()),
      }],
    };

    await expect(readHistory(storage)).resolves.toEqual(createEmptyHistoryState());
  });
});
