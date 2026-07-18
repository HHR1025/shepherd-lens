import type { FeedItem } from "./feed-item";
import {
  HISTORY_STORAGE_KEY,
  type HistoryState,
} from "./history-tracking";
import {
  RUNTIME_PERSISTENCE_MESSAGE,
  type RuntimePersistence,
  type RuntimePersistenceRequest,
  type RuntimePersistenceResponse,
  type RuntimeStoredState,
} from "./runtime-persistence";
import type {
  ExperimentKind,
  UserExperimentState,
} from "./user-experiment";
import { USER_EXPERIMENT_STORAGE_KEY } from "./user-experiment";

export function createBrowserRuntimePersistence(): RuntimePersistence | null {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return null;
  }

  return {
    subscribe(listener) {
      const handleStorageChange = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string,
      ) => {
        if (
          areaName === "local" &&
          (HISTORY_STORAGE_KEY in changes ||
            USER_EXPERIMENT_STORAGE_KEY in changes)
        ) {
          listener();
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);

      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    },
    readState: () =>
      sendPersistenceMessage<RuntimeStoredState>({
        type: RUNTIME_PERSISTENCE_MESSAGE,
        operation: "read-state",
      }),
    saveHistory: (feedItems, url) =>
      sendPersistenceMessage<HistoryState>({
        type: RUNTIME_PERSISTENCE_MESSAGE,
        operation: "save-history",
        feedItems,
        url,
      }),
    startExperiment: (kind, note, feedItems, url) =>
      sendPersistenceMessage<UserExperimentState>({
        type: RUNTIME_PERSISTENCE_MESSAGE,
        operation: "start-experiment",
        feedItems,
        kind,
        note,
        url,
      }),
    completeExperiment: (feedItems, url) =>
      sendPersistenceMessage<UserExperimentState>({
        type: RUNTIME_PERSISTENCE_MESSAGE,
        operation: "complete-experiment",
        feedItems,
        url,
      }),
  };
}

async function sendPersistenceMessage<T>(
  request: RuntimePersistenceRequest,
): Promise<T> {
  const response =
    await chrome.runtime.sendMessage<
      RuntimePersistenceRequest,
      RuntimePersistenceResponse<T>
    >(request);

  if (!response?.ok) {
    throw new Error(response?.error || "Extension persistence request failed.");
  }

  return response.value;
}

export type { ExperimentKind, FeedItem };
