import {
  readHistory,
  saveHistorySnapshot,
} from "./history-tracking";
import {
  isRuntimePersistenceRequest,
  type RuntimePersistenceRequest,
  type RuntimePersistenceResponse,
} from "./runtime-persistence";
import { createSerialTaskQueue } from "./serial-task-queue";
import {
  completeActiveUserExperiment,
  readUserExperimentState,
  startUserExperiment,
} from "./user-experiment";

const enqueuePersistence = createSerialTaskQueue();

chrome.runtime.onInstalled.addListener(() => {
  console.info("[Shepherd Lens] installed");
});

chrome.runtime.onMessage.addListener(
  (
    request: unknown,
    sender,
    sendResponse: (
      response: RuntimePersistenceResponse<unknown>,
    ) => void,
  ) => {
    if (
      sender.id !== chrome.runtime.id ||
      !isRuntimePersistenceRequest(request)
    ) {
      return false;
    }

    enqueuePersistence(() => handlePersistenceRequest(request))
      .then((value) => {
        sendResponse({
          ok: true,
          value,
        });
      })
      .catch((error: unknown) => {
        console.warn("[Shepherd Lens] persistence operation failed.", error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown persistence error.",
        });
      });

    return true;
  },
);

async function handlePersistenceRequest(request: RuntimePersistenceRequest) {
  const storage = chrome.storage.local;

  switch (request.operation) {
    case "read-state": {
      const [history, experiments] = await Promise.all([
        readHistory(storage),
        readUserExperimentState(storage),
      ]);

      return { experiments, history };
    }
    case "save-history": {
      const result = await saveHistorySnapshot(
        storage,
        request.feedItems,
        request.url,
      );

      return result.history;
    }
    case "start-experiment":
      return startUserExperiment(
        storage,
        request.kind,
        request.note,
        request.feedItems,
        request.url,
      );
    case "complete-experiment":
      return completeActiveUserExperiment(
        storage,
        request.feedItems,
        request.url,
      );
  }
}
