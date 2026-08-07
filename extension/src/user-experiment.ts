import { calculateAttentionSignals, type AttentionSignalSummary } from "./attention-signals";
import type { FeedItem } from "./feed-item";
import {
  assertBoundedString,
  assertPersistableFeedItems,
  isAttentionSignalSummary,
  isBoundedString,
  isFiniteNumber,
  isNullableString,
  isRecord,
  MAX_PERSISTED_FEED_ITEMS,
  MAX_PERSISTED_NOTE_LENGTH,
  MAX_PERSISTED_URL_LENGTH,
} from "./runtime-schema";
import type { StorageAreaLike } from "./storage";
import { assertSupportedStorageVersion } from "./storage-schema";

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
  version: typeof USER_EXPERIMENT_SCHEMA_VERSION;
  activeExperiment: UserExperiment | null;
  experiments: UserExperiment[];
};

export type { StorageAreaLike } from "./storage";

export const USER_EXPERIMENT_STORAGE_KEY = "shepherdLensUserExperiments";
export const USER_EXPERIMENT_SCHEMA_VERSION = 1 as const;
export const MAX_COMPLETED_EXPERIMENTS = 20;

export function createEmptyUserExperimentState(): UserExperimentState {
  return {
    version: USER_EXPERIMENT_SCHEMA_VERSION,
    activeExperiment: null,
    experiments: [],
  };
}

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
  assertSupportedStorageVersion(
    value,
    USER_EXPERIMENT_STORAGE_KEY,
    USER_EXPERIMENT_SCHEMA_VERSION,
  );

  if (isUserExperimentState(value)) {
    return value;
  }

  if (isLegacyUserExperimentState(value)) {
    return {
      version: USER_EXPERIMENT_SCHEMA_VERSION,
      activeExperiment: value.activeExperiment,
      experiments: value.experiments,
    };
  }

  return createEmptyUserExperimentState();
}

export async function startUserExperiment(
  storage: StorageAreaLike,
  kind: ExperimentKind,
  note: string,
  feedItems: FeedItem[],
  url: string,
  now = new Date(),
) {
  assertPersistableFeedItems(feedItems);
  assertBoundedString(note, MAX_PERSISTED_NOTE_LENGTH, "Experiment note");
  assertBoundedString(url, MAX_PERSISTED_URL_LENGTH, "Experiment URL");
  const state = await readUserExperimentState(storage);
  const nextState: UserExperimentState = {
    ...state,
    version: USER_EXPERIMENT_SCHEMA_VERSION,
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
  assertPersistableFeedItems(feedItems);
  assertBoundedString(url, MAX_PERSISTED_URL_LENGTH, "Experiment URL");
  const state = await readUserExperimentState(storage);

  if (!state.activeExperiment) {
    return state;
  }

  const completedExperiment = completeExperiment(state.activeExperiment, feedItems, url, now);
  const nextState: UserExperimentState = {
    version: USER_EXPERIMENT_SCHEMA_VERSION,
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
    isRecord(value) &&
    value.version === USER_EXPERIMENT_SCHEMA_VERSION &&
    (value.activeExperiment === null || isUserExperiment(value.activeExperiment)) &&
    Array.isArray(value.experiments) &&
    value.experiments.length <= MAX_COMPLETED_EXPERIMENTS &&
    value.experiments.every(isUserExperiment)
  );
}

function isLegacyUserExperimentState(
  value: unknown,
): value is Omit<UserExperimentState, "version"> {
  return (
    isRecord(value) &&
    value.version === undefined &&
    (value.activeExperiment === null || isUserExperiment(value.activeExperiment)) &&
    Array.isArray(value.experiments) &&
    value.experiments.length <= MAX_COMPLETED_EXPERIMENTS &&
    value.experiments.every(isUserExperiment)
  );
}

function isUserExperiment(value: unknown): value is UserExperiment {
  return (
    isRecord(value) &&
    isBoundedString(value.id, 200) &&
    isExperimentKind(value.kind) &&
    isBoundedString(value.note, MAX_PERSISTED_NOTE_LENGTH) &&
    isBoundedString(value.startedAt, 64) &&
    Number.isFinite(Date.parse(value.startedAt)) &&
    isNullableString(value.endedAt) &&
    (value.endedAt === null || Number.isFinite(Date.parse(value.endedAt))) &&
    isExperimentSnapshot(value.baseline) &&
    (value.after === null || isExperimentSnapshot(value.after)) &&
    Array.isArray(value.deltas) &&
    value.deltas.length <= 10 &&
    value.deltas.every(isExperimentSignalDelta)
  );
}

function isExperimentSnapshot(value: unknown): value is ExperimentSnapshot {
  return (
    isRecord(value) &&
    isFiniteNumber(value.itemCount) &&
    value.itemCount >= 0 &&
    value.itemCount <= MAX_PERSISTED_FEED_ITEMS &&
    isAttentionSignalSummary(value.signals) &&
    isBoundedString(value.timestamp, 64) &&
    Number.isFinite(Date.parse(value.timestamp)) &&
    isBoundedString(value.url, MAX_PERSISTED_URL_LENGTH)
  );
}

function isExperimentSignalDelta(value: unknown): value is ExperimentSignalDelta {
  return (
    isRecord(value) &&
    isBoundedString(value.id, 80) &&
    isBoundedString(value.label, 100) &&
    isFiniteNumber(value.before) &&
    value.before >= 0 &&
    value.before <= 100 &&
    isFiniteNumber(value.after) &&
    value.after >= 0 &&
    value.after <= 100 &&
    isFiniteNumber(value.delta)
  );
}

export function isExperimentKind(value: unknown): value is ExperimentKind {
  return (
    value === "search" ||
    value === "watch" ||
    value === "ignore" ||
    value === "recovery" ||
    value === "note"
  );
}
