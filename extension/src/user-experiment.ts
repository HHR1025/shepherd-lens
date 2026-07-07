import { calculateAttentionSignals, type AttentionSignalSummary } from "./attention-signals";
import type { FeedItem } from "./feed-item";

export type ExperimentKind = "search" | "watch" | "ignore" | "recovery" | "note";

export type ExperimentSnapshot = {
  itemCount: number;
  signals: AttentionSignalSummary;
  timestamp: string;
  url: string;
};

export type ExperimentSignalDelta = {
  id: string;
  label: string;
  before: number;
  after: number;
  delta: number;
};

export type UserExperiment = {
  id: string;
  kind: ExperimentKind;
  note: string;
  startedAt: string;
  endedAt: string | null;
  baseline: ExperimentSnapshot;
  after: ExperimentSnapshot | null;
  deltas: ExperimentSignalDelta[];
};

export type UserExperimentState = {
  activeExperiment: UserExperiment | null;
  experiments: UserExperiment[];
};

export type StorageAreaLike = {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

export const USER_EXPERIMENT_STORAGE_KEY = "shepherdLensUserExperiments";
export const MAX_COMPLETED_EXPERIMENTS = 20;

export function createExperiment(
  kind: ExperimentKind,
  note: string,
  feedItems: FeedItem[],
  url: string,
  now = new Date(),
): UserExperiment {
  const timestamp = now.toISOString();

  return {
    id: `${now.getTime()}-${kind}`,
    kind,
    note: note.trim(),
    startedAt: timestamp,
    endedAt: null,
    baseline: createExperimentSnapshot(feedItems, url, now),
    after: null,
    deltas: [],
  };
}

export function completeExperiment(
  experiment: UserExperiment,
  feedItems: FeedItem[],
  url: string,
  now = new Date(),
): UserExperiment {
  const after = createExperimentSnapshot(feedItems, url, now);

  return {
    ...experiment,
    endedAt: now.toISOString(),
    after,
    deltas: compareExperimentSignals(experiment.baseline.signals, after.signals),
  };
}

export function createExperimentSnapshot(
  feedItems: FeedItem[],
  url: string,
  now = new Date(),
): ExperimentSnapshot {
  return {
    itemCount: feedItems.length,
    signals: calculateAttentionSignals(feedItems),
    timestamp: now.toISOString(),
    url,
  };
}

export function compareExperimentSignals(
  before: AttentionSignalSummary,
  after: AttentionSignalSummary,
) {
  return after.signals.map((afterSignal) => {
    const beforeSignal = before.signals.find((signal) => signal.id === afterSignal.id);
    const beforeValue = beforeSignal?.value ?? 0;

    return {
      id: afterSignal.id,
      label: afterSignal.label,
      before: beforeValue,
      after: afterSignal.value,
      delta: afterSignal.value - beforeValue,
    };
  });
}

export function trimCompletedExperiments(
  experiments: UserExperiment[],
  maxExperiments = MAX_COMPLETED_EXPERIMENTS,
) {
  return experiments.slice(Math.max(0, experiments.length - maxExperiments));
}

export async function readUserExperimentState(
  storage: StorageAreaLike,
): Promise<UserExperimentState> {
  const result = await storage.get([USER_EXPERIMENT_STORAGE_KEY]);
  const value = result[USER_EXPERIMENT_STORAGE_KEY];

  if (!isUserExperimentState(value)) {
    return {
      activeExperiment: null,
      experiments: [],
    };
  }

  return value;
}

export async function startUserExperiment(
  storage: StorageAreaLike,
  kind: ExperimentKind,
  note: string,
  feedItems: FeedItem[],
  url: string,
  now = new Date(),
) {
  const state = await readUserExperimentState(storage);
  const nextState: UserExperimentState = {
    ...state,
    activeExperiment: createExperiment(kind, note, feedItems, url, now),
  };

  await writeUserExperimentState(storage, nextState);

  return nextState;
}

export async function completeActiveUserExperiment(
  storage: StorageAreaLike,
  feedItems: FeedItem[],
  url: string,
  now = new Date(),
) {
  const state = await readUserExperimentState(storage);

  if (!state.activeExperiment) {
    return state;
  }

  const completedExperiment = completeExperiment(state.activeExperiment, feedItems, url, now);
  const nextState: UserExperimentState = {
    activeExperiment: null,
    experiments: trimCompletedExperiments([...state.experiments, completedExperiment]),
  };

  await writeUserExperimentState(storage, nextState);

  return nextState;
}

async function writeUserExperimentState(
  storage: StorageAreaLike,
  state: UserExperimentState,
) {
  await storage.set({
    [USER_EXPERIMENT_STORAGE_KEY]: state,
  });
}

function isUserExperimentState(value: unknown): value is UserExperimentState {
  return (
    typeof value === "object" &&
    value !== null &&
    "experiments" in value &&
    Array.isArray((value as UserExperimentState).experiments)
  );
}
