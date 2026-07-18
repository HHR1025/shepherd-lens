import type { FeedItem } from "./feed-item";
import type { HistoryState } from "./history-tracking";
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

export function createBrowserRuntimePersistence(): RuntimePersistence | null {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return null;
  }

  return {
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
