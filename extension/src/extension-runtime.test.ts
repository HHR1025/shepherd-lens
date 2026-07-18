import { describe, expect, it, vi } from "vitest";
import type { FeedItem } from "./feed-item";
import { ExtensionRuntime } from "./extension-runtime";
import { createEmptyHistoryState } from "./history-tracking";
import type { PlatformAdapter } from "./platform-adapter";
import type { RuntimePersistence } from "./runtime-persistence";
import { createEmptyUserExperimentState } from "./user-experiment";

function item(title: string): FeedItem {
  return {
    title,
    channel: "Test Channel",
    description: "",
    duration: "10:00",
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(title)}`,
  };
}

function createAdapter(feedItems: FeedItem[]) {
  let changeCallback: (() => void) | undefined;
  const cleanup = vi.fn();
  const observeFeedChanges = vi.fn((callback: () => void) => {
    changeCallback = callback;
    return cleanup;
  });
  const adapter: PlatformAdapter = {
    platform: "test",
    detectPage: () => true,
    extractVisibleItems: vi.fn(() => feedItems),
    observeFeedChanges,
    getPlatformMetadata: () => ({
      id: "test",
      name: "Test",
      url: "https://example.test/",
    }),
  };

  return {
    adapter,
    cleanup,
    notifyPageChange: () => changeCallback?.(),
    observeFeedChanges,
  };
}

function createTimerHarness() {
  const callbacks = new Map<number, () => void>();
  let nextId = 1;
  let clearCount = 0;

  return {
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => {
      clearCount += 1;
      callbacks.delete(timer as unknown as number);
    },
    getClearCount: () => clearCount,
    getPendingCount: () => callbacks.size,
    flush() {
      for (const [id, callback] of [...callbacks]) {
        callbacks.delete(id);
        callback();
      }
    },
    setTimeout: (callback: () => void) => {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id as unknown as ReturnType<typeof setTimeout>;
    },
  };
}

describe("ExtensionRuntime", () => {
  it("starts idempotently and owns one platform observer", () => {
    const adapter = createAdapter([item("First item")]);
    const timers = createTimerHarness();
    const onPageChange = vi.fn();
    const runtime = new ExtensionRuntime({
      adapter: adapter.adapter,
      clearTimeout: timers.clearTimeout,
      getUrl: () => "https://example.test/",
      persistence: null,
      root: {} as ParentNode,
      setTimeout: timers.setTimeout,
    });

    expect(runtime.start(onPageChange)).toBe(true);
    expect(runtime.start(onPageChange)).toBe(false);
    expect(adapter.observeFeedChanges).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledTimes(1);

    timers.flush();

    expect(runtime.getSnapshot().feedItems).toEqual([item("First item")]);
  });

  it("publishes extracted feed changes through the store subscription", () => {
    const adapter = createAdapter([item("Observed item")]);
    const timers = createTimerHarness();
    const listener = vi.fn();
    const runtime = new ExtensionRuntime({
      adapter: adapter.adapter,
      clearTimeout: timers.clearTimeout,
      getUrl: () => "https://example.test/",
      persistence: null,
      root: {} as ParentNode,
      setTimeout: timers.setTimeout,
    });

    const unsubscribe = runtime.subscribe(listener);
    runtime.start();
    timers.flush();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(runtime.getSnapshot().feedItems[0]?.title).toBe("Observed item");

    unsubscribe();
    adapter.notifyPageChange();
    timers.flush();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not starve extraction while a busy page keeps changing", () => {
    const adapter = createAdapter([item("Busy page item")]);
    const timers = createTimerHarness();
    const runtime = new ExtensionRuntime({
      adapter: adapter.adapter,
      clearTimeout: timers.clearTimeout,
      getUrl: () => "https://example.test/",
      persistence: null,
      root: {} as ParentNode,
      setTimeout: timers.setTimeout,
    });

    runtime.start();

    for (let index = 0; index < 100; index += 1) {
      adapter.notifyPageChange();
    }

    expect(timers.getPendingCount()).toBe(1);
    expect(timers.getClearCount()).toBe(0);

    timers.flush();

    expect(runtime.getSnapshot().feedItems[0]?.title).toBe("Busy page item");
  });

  it("cleans up observation and pending extraction when stopped", () => {
    const adapter = createAdapter([item("Pending item")]);
    const timers = createTimerHarness();
    const runtime = new ExtensionRuntime({
      adapter: adapter.adapter,
      clearTimeout: timers.clearTimeout,
      getUrl: () => "https://example.test/",
      persistence: null,
      root: {} as ParentNode,
      setTimeout: timers.setTimeout,
    });

    runtime.start();
    runtime.stop();
    timers.flush();

    expect(adapter.cleanup).toHaveBeenCalledTimes(1);
    expect(runtime.getSnapshot().feedItems).toEqual([]);
  });

  it("refreshes stored state after another tab changes extension storage", async () => {
    const adapter = createAdapter([item("Observed item")]);
    const timers = createTimerHarness();
    let storageListener: (() => void) | undefined;
    const unsubscribeStorage = vi.fn();
    const history = createEmptyHistoryState();
    const persistence: RuntimePersistence = {
      subscribe: vi.fn((listener) => {
        storageListener = listener;
        return unsubscribeStorage;
      }),
      readState: vi
        .fn()
        .mockResolvedValueOnce({
          experiments: createEmptyUserExperimentState(),
          history,
        })
        .mockResolvedValueOnce({
          experiments: createEmptyUserExperimentState(),
          history: {
            ...history,
            snapshots: [
              {
                id: "external",
                timestamp: "2026-07-18T20:00:00.000Z",
                url: "https://example.test/",
                pageType: "other",
                feedItems: [item("External tab item")],
                signals: {
                  itemCount: 1,
                  signals: [],
                },
                feedKey: "external",
              },
            ],
          },
        }),
      saveHistory: vi.fn(async () => history),
      startExperiment: vi.fn(async () => createEmptyUserExperimentState()),
      completeExperiment: vi.fn(async () => createEmptyUserExperimentState()),
    };
    const runtime = new ExtensionRuntime({
      adapter: adapter.adapter,
      clearTimeout: timers.clearTimeout,
      getUrl: () => "https://example.test/",
      persistence,
      root: {} as ParentNode,
      setTimeout: timers.setTimeout,
    });

    runtime.start();
    await vi.waitFor(() => {
      expect(persistence.readState).toHaveBeenCalledTimes(1);
    });

    storageListener?.();

    await vi.waitFor(() => {
      expect(runtime.getSnapshot().history.snapshots).toHaveLength(1);
    });

    runtime.stop();
    expect(unsubscribeStorage).toHaveBeenCalledTimes(1);
  });
});
