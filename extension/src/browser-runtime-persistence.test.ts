import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserRuntimePersistence } from "./browser-runtime-persistence";
import { HISTORY_STORAGE_KEY } from "./history-tracking";

describe("browser runtime persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("notifies subscribers when shared runtime storage changes", () => {
    let storageListener:
      | ((
          changes: Record<string, chrome.storage.StorageChange>,
          areaName: string,
        ) => void)
      | undefined;
    const removeListener = vi.fn();

    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn(),
      },
      storage: {
        onChanged: {
          addListener: vi.fn((listener) => {
            storageListener = listener;
          }),
          removeListener,
        },
      },
    });

    const persistence = createBrowserRuntimePersistence();
    const subscriber = vi.fn();
    const unsubscribe = persistence?.subscribe(subscriber);

    storageListener?.({}, "sync");
    storageListener?.(
      {
        unrelated: {
          newValue: true,
        },
      },
      "local",
    );
    expect(subscriber).not.toHaveBeenCalled();

    storageListener?.(
      {
        [HISTORY_STORAGE_KEY]: {
          newValue: {
            version: 1,
            snapshots: [],
          },
        },
      },
      "local",
    );
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe?.();
    expect(removeListener).toHaveBeenCalledWith(storageListener);
  });
});
