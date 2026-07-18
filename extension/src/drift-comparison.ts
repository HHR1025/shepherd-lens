import type { AttentionSignalSummary } from "./attention-signals";
import { calculateAttentionSignals } from "./attention-signals";
import type { FeedItem } from "./feed-item";
import { cleanText } from "./feed-item";
import type { HistorySnapshot } from "./history-tracking";
import { tokenizeText } from "./text-analysis";

export type DriftDirection = "rising" | "falling" | "steady";

export type SignalDrift = {
  id: string;
  label: string;
  current: number;
  previous: number;
  delta: number;
  direction: DriftDirection;
};

export type DriftComparison = {
  baselineAvailable: boolean;
  baselineTimestamp: string | null;
  summary: string;
  changes: SignalDrift[];
  repeatedChannels: string[];
  repeatedTopics: string[];
};

const SIGNAL_IDS = ["stimulation", "conflict", "novelty", "repetition", "short_form"];
const DIRECTION_THRESHOLD = 8;
const MAX_REPEATED_ENTRIES = 3;
const topicStopWords = new Set([
  "about",
  "after",
  "before",
  "china",
  "from",
  "have",
  "into",
  "that",
  "this",
  "what",
  "when",
  "with",
  "your",
]);

export function compareFeedDrift(
  currentItems: FeedItem[],
  snapshots: HistorySnapshot[],
): DriftComparison {
  const currentSignals = calculateAttentionSignals(currentItems);
  const baseline = findBaselineSnapshot(currentItems, snapshots);

  if (!baseline) {
    return {
      baselineAvailable: false,
      baselineTimestamp: null,
      summary: "waiting for history",
      changes: createEmptyChanges(currentSignals),
      repeatedChannels: [],
      repeatedTopics: [],
    };
  }

  const changes = compareSignals(currentSignals, baseline.signals);
  const primaryChanges = changes.filter((change) => change.direction !== "steady");

  return {
    baselineAvailable: true,
    baselineTimestamp: baseline.timestamp,
    summary:
      primaryChanges.length > 0
        ? primaryChanges
            .slice(0, 2)
            .map((change) => `${change.label.toLowerCase()} ${change.direction}`)
            .join(", ")
        : "signals steady",
    changes,
    repeatedChannels: findRepeatedChannels(currentItems, baseline.feedItems),
    repeatedTopics: findRepeatedTopics(currentItems, baseline.feedItems),
  };
}

export function compareSignals(
  current: AttentionSignalSummary,
  previous: AttentionSignalSummary,
) {
  return SIGNAL_IDS.map((id) => {
    const currentSignal = current.signals.find((signal) => signal.id === id);
    const previousSignal = previous.signals.find((signal) => signal.id === id);
    const currentValue = currentSignal?.value ?? 0;
    const previousValue = previousSignal?.value ?? 0;
    const delta = currentValue - previousValue;

    return {
      id,
      label: currentSignal?.label ?? previousSignal?.label ?? id,
      current: currentValue,
      previous: previousValue,
      delta,
      direction: directionForDelta(delta),
    };
  });
}

export function directionForDelta(delta: number): DriftDirection {
  if (delta >= DIRECTION_THRESHOLD) {
    return "rising";
  }

  if (delta <= -DIRECTION_THRESHOLD) {
    return "falling";
  }

  return "steady";
}

export function findRepeatedChannels(currentItems: FeedItem[], previousItems: FeedItem[]) {
  const previousChannels = new Set(
    previousItems.map((item) => cleanText(item.channel).toLowerCase()).filter(Boolean),
  );
  const repeated = new Map<string, string>();

  for (const item of currentItems) {
    const channel = cleanText(item.channel);
    const key = channel.toLowerCase();

    if (key && previousChannels.has(key)) {
      repeated.set(key, channel);
    }
  }

  return [...repeated.values()].slice(0, MAX_REPEATED_ENTRIES);
}

export function findRepeatedTopics(currentItems: FeedItem[], previousItems: FeedItem[]) {
  const previousTokens = new Set(previousItems.flatMap((item) => topicTokens(item.title)));
  const repeated = new Map<string, string>();

  for (const item of currentItems) {
    for (const token of topicTokens(item.title)) {
      if (previousTokens.has(token)) {
        repeated.set(token, token);
      }
    }
  }

  return [...repeated.values()].slice(0, MAX_REPEATED_ENTRIES);
}

function findBaselineSnapshot(currentItems: FeedItem[], snapshots: HistorySnapshot[]) {
  const currentKey = createComparableFeedKey(currentItems);

  return [...snapshots]
    .reverse()
    .find((snapshot) => snapshot.feedItems.length > 0 && snapshot.feedKey !== currentKey);
}

function createEmptyChanges(current: AttentionSignalSummary) {
  return current.signals.map((signal) => ({
    id: signal.id,
    label: signal.label,
    current: signal.value,
    previous: 0,
    delta: 0,
    direction: "steady" as const,
  }));
}

function createComparableFeedKey(items: FeedItem[]) {
  return items
    .map((item) => item.url || `${item.title.toLowerCase()}::${item.channel.toLowerCase()}`)
    .sort()
    .join("|");
}

function topicTokens(title: string) {
  return tokenizeText(title, { minLength: 4, stopWords: topicStopWords });
}
