import type { FeedItem } from "./feed-item";
import { cleanText, normalizeKey } from "./feed-item";
import type { HistorySnapshot } from "./history-tracking";

export type SessionTimelineSummary = {
  snapshotCount: number;
  activeSessionSnapshots: number;
  sessionSimilarity: number;
  topicSwitchingSpeed: number;
  noveltyDecay: number;
  recurringChannels: string[];
  recurringTopics: string[];
};

const SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_RECENT_SNAPSHOTS = 12;
const MAX_RECURRING_ENTRIES = 3;
const topicStopWords = new Set([
  "about",
  "after",
  "before",
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

export function analyzeSessionTimeline(
  currentItems: FeedItem[],
  snapshots: HistorySnapshot[],
): SessionTimelineSummary {
  const recentSnapshots = snapshots.slice(-MAX_RECENT_SNAPSHOTS);
  const previousSnapshot = findPreviousDifferentSnapshot(currentItems, recentSnapshots);
  const historicalItems = recentSnapshots.flatMap((snapshot) => snapshot.feedItems);

  return {
    snapshotCount: recentSnapshots.length,
    activeSessionSnapshots: countActiveSessionSnapshots(recentSnapshots),
    sessionSimilarity: previousSnapshot
      ? calculateFeedSimilarity(currentItems, previousSnapshot.feedItems)
      : 0,
    topicSwitchingSpeed: calculateTopicSwitchingSpeed(currentItems),
    noveltyDecay: calculateNoveltyDecay(currentItems, historicalItems),
    recurringChannels: findRecurringChannels(currentItems, historicalItems),
    recurringTopics: findRecurringTopics(currentItems, historicalItems),
  };
}

export function calculateFeedSimilarity(firstItems: FeedItem[], secondItems: FeedItem[]) {
  const firstKeys = new Set(firstItems.map((item) => normalizeKey(item)));
  const secondKeys = new Set(secondItems.map((item) => normalizeKey(item)));

  return jaccardScore(firstKeys, secondKeys);
}

export function calculateTopicSwitchingSpeed(items: FeedItem[]) {
  if (items.length < 2) {
    return 0;
  }

  const distances: number[] = [];

  for (let index = 1; index < items.length; index += 1) {
    const previousTokens = new Set(topicTokens(items[index - 1].title));
    const currentTokens = new Set(topicTokens(items[index].title));
    const similarity = jaccardScore(previousTokens, currentTokens);

    distances.push(100 - similarity);
  }

  return averageScore(distances);
}

export function calculateNoveltyDecay(currentItems: FeedItem[], historicalItems: FeedItem[]) {
  if (currentItems.length === 0 || historicalItems.length === 0) {
    return 0;
  }

  const historicalKeys = new Set(historicalItems.map((item) => normalizeKey(item)));
  const historicalTopics = new Set(historicalItems.flatMap((item) => topicTokens(item.title)));
  const scores = currentItems.map((item) => {
    const directRepeat = historicalKeys.has(normalizeKey(item)) ? 55 : 0;
    const topics = topicTokens(item.title);
    const topicRepeat =
      topics.length === 0
        ? 0
        : (topics.filter((token) => historicalTopics.has(token)).length / topics.length) * 45;

    return directRepeat + topicRepeat;
  });

  return averageScore(scores);
}

export function findRecurringChannels(currentItems: FeedItem[], historicalItems: FeedItem[]) {
  const currentChannels = new Map(
    currentItems
      .map((item) => cleanText(item.channel))
      .filter(Boolean)
      .map((channel) => [channel.toLowerCase(), channel]),
  );
  const historicalCounts = countValues(
    historicalItems.map((item) => cleanText(item.channel).toLowerCase()).filter(Boolean),
  );

  return [...currentChannels.entries()]
    .map(([key, channel]) => ({ channel, count: historicalCounts.get(key) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((first, second) => second.count - first.count || first.channel.localeCompare(second.channel))
    .slice(0, MAX_RECURRING_ENTRIES)
    .map((entry) => entry.channel);
}

export function findRecurringTopics(currentItems: FeedItem[], historicalItems: FeedItem[]) {
  const currentTopics = new Set(currentItems.flatMap((item) => topicTokens(item.title)));
  const historicalCounts = countValues(historicalItems.flatMap((item) => topicTokens(item.title)));

  return [...currentTopics]
    .map((topic) => ({ topic, count: historicalCounts.get(topic) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((first, second) => second.count - first.count || first.topic.localeCompare(second.topic))
    .slice(0, MAX_RECURRING_ENTRIES)
    .map((entry) => entry.topic);
}

function findPreviousDifferentSnapshot(
  currentItems: FeedItem[],
  snapshots: HistorySnapshot[],
) {
  const currentKey = createFeedKey(currentItems);

  return [...snapshots]
    .reverse()
    .find((snapshot) => snapshot.feedItems.length > 0 && snapshot.feedKey !== currentKey);
}

function countActiveSessionSnapshots(snapshots: HistorySnapshot[]) {
  if (snapshots.length === 0) {
    return 0;
  }

  const orderedSnapshots = [...snapshots].sort(
    (first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp),
  );
  let count = 1;

  for (let index = orderedSnapshots.length - 1; index > 0; index -= 1) {
    const currentTime = Date.parse(orderedSnapshots[index].timestamp);
    const previousTime = Date.parse(orderedSnapshots[index - 1].timestamp);

    if (!Number.isFinite(currentTime) || !Number.isFinite(previousTime)) {
      break;
    }

    if (currentTime - previousTime > SESSION_GAP_MS) {
      break;
    }

    count += 1;
  }

  return count;
}

function createFeedKey(items: FeedItem[]) {
  return items.map((item) => normalizeKey(item)).sort().join("|");
}

function topicTokens(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !topicStopWords.has(token));
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function jaccardScore(first: Set<string>, second: Set<string>) {
  if (first.size === 0 && second.size === 0) {
    return 0;
  }

  const intersection = [...first].filter((value) => second.has(value)).length;
  const union = new Set([...first, ...second]).size;

  return Math.round((intersection / union) * 100);
}

function averageScore(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
