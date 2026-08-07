import type { FeedItem } from "./feed-item";
import type { HistoryState } from "./history-tracking";
import {
  isBoundedString,
  isPersistableFeedItems,
  isRecord,
  MAX_PERSISTED_NOTE_LENGTH,
  MAX_PERSISTED_URL_LENGTH,
} from "./runtime-schema";
import {
  isExperimentKind,
  type ExperimentKind,
  type UserExperimentState,
} from "./user-experiment";

export const RUNTIME_PERSISTENCE_MESSAGE = "shepherd-lens-runtime-persistence";
export { MAX_PERSISTED_FEED_ITEMS } from "./runtime-schema";

export type RuntimeStoredState = {
  experiments: UserExperimentState;
  history: HistoryState;
};

export type RuntimePersistenceRequest =
  | {
      type: typeof RUNTIME_PERSISTENCE_MESSAGE;
      operation: "read-state";
    }
  | {
      type: typeof RUNTIME_PERSISTENCE_MESSAGE;
      operation: "save-history";
      feedItems: FeedItem[];
      url: string;
    }
  | {
      type: typeof RUNTIME_PERSISTENCE_MESSAGE;
      operation: "start-experiment";
      feedItems: FeedItem[];
      kind: ExperimentKind;
      note: string;
      url: string;
    }
  | {
      type: typeof RUNTIME_PERSISTENCE_MESSAGE;
      operation: "complete-experiment";
      feedItems: FeedItem[];
      url: string;
    };

export type RuntimePersistenceResponse<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

export type RuntimePersistence = {
  subscribe(listener: () => void): () => void;
  readState(): Promise<RuntimeStoredState>;
  saveHistory(feedItems: FeedItem[], url: string): Promise<HistoryState>;
  startExperiment(
    kind: ExperimentKind,
    note: string,
    feedItems: FeedItem[],
    url: string,
  ): Promise<UserExperimentState>;
  completeExperiment(
    feedItems: FeedItem[],
    url: string,
  ): Promise<UserExperimentState>;
};

export function isRuntimePersistenceRequest(
  value: unknown,
): value is RuntimePersistenceRequest {
  if (!isRecord(value) || value.type !== RUNTIME_PERSISTENCE_MESSAGE) {
    return false;
  }

  if (value.operation === "read-state") {
    return true;
  }

  if (
    !isBoundedString(value.url, MAX_PERSISTED_URL_LENGTH) ||
    !isPersistableFeedItems(value.feedItems)
  ) {
    return false;
  }

  if (
    value.operation === "save-history" ||
    value.operation === "complete-experiment"
  ) {
    return true;
  }

  return (
    value.operation === "start-experiment" &&
    isExperimentKind(value.kind) &&
    isBoundedString(value.note, MAX_PERSISTED_NOTE_LENGTH)
  );
}
