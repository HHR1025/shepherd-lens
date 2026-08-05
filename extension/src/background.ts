import {
  readHistory,
  saveHistorySnapshot,
} from "./history-tracking";
import {
  isEvidenceSearchRequest,
  retrieveEvidence,
  type EvidenceSearchResponse,
} from "./evidence-retrieval";
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
    sendResponse: (response: BackgroundResponse) => void,
  ) => {
    if (sender.id !== chrome.runtime.id) {
      return false;
    }

    const operation = isRuntimePersistenceRequest(request)
      ? enqueuePersistence(() => handlePersistenceRequest(request))
      : isEvidenceSearchRequest(request)
        ? retrieveEvidence(request.query, request.language)
        : null;

    if (!operation) {
      return false;
    }

    operation
      .then((value) => {
        sendResponse({
          ok: true,
          value,
        });
      })
      .catch((error: unknown) => {
        console.warn("[Shepherd Lens] background operation failed.", error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown background error.",
        });
      });

    return true;
  },
);

type BackgroundResponse =
  | RuntimePersistenceResponse<unknown>
  | EvidenceSearchResponse;

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
