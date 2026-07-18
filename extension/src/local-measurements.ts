import type { FeedItem } from "./feed-item";
import { cleanText } from "./feed-item";
import { countPhraseHits, tokenizeText } from "./text-analysis";

export type LocalMeasureLevel = "low" | "moderate" | "high";

export type LocalMeasure = {
  id: string;
  label: string;
  value: number;
  level: LocalMeasureLevel;
  evidence: string[];
};

export type LocalMeasurementSummary = {
  itemCount: number;
  metrics: LocalMeasure[];
};

const stopWords = new Set([
  "about",
  "after",
  "before",
  "from",
  "have",
  "into",
  "that",
  "the",
  "this",
  "what",
  "when",
  "with",
  "your",
  "一个",
  "这个",
  "那个",
  "我们",
  "你们",
  "他们",
]);

const hookWords = [
  "amazing",
  "biggest",
  "breaking",
  "crazy",
  "exposed",
  "illegal",
  "insane",
  "secret",
  "shocking",
  "unbelievable",
  "you won't believe",
  "曝光",
  "疯狂",
  "揭秘",
  "惊人",
  "绝了",
  "秘密",
  "史上",
  "万万没想到",
  "真相",
  "震惊",
  "最大",
  "最强",
];

export function calculateLocalMeasurements(items: FeedItem[]): LocalMeasurementSummary {
  return {
    itemCount: items.length,
    metrics: [
      calculateChannelConcentration(items),
      calculateTopicConcentration(items),
      calculateVisibleFeedEntropy(items),
      calculateSourceDiversity(items),
      calculateTitleHookDensity(items),
    ],
  };
}

export function calculateChannelConcentration(items: FeedItem[]) {
  const counts = countValues(items.map((item) => cleanText(item.channel)).filter(Boolean));
  const top = topEntries(counts);
  const value = concentrationScore(counts, items.length);

  return metric(
    "channel_concentration",
    "Channel concentration",
    value,
    top.length > 0
      ? top.map(([channel, count]) => `${channel} appears ${count} time${count === 1 ? "" : "s"}`)
      : ["No visible channel names"],
  );
}

export function calculateTopicConcentration(items: FeedItem[]) {
  const counts = countValues(items.flatMap((item) => topicTokens(item.title)));
  const top = topEntries(counts);
  const value = concentrationScore(counts, Math.max(totalCount(counts), 1));

  return metric(
    "topic_concentration",
    "Topic concentration",
    value,
    top.length > 0 ? top.map(([token]) => token) : ["No repeated title topics"],
  );
}

export function calculateVisibleFeedEntropy(items: FeedItem[]) {
  const tokens = items.flatMap((item) => topicTokens(item.title));
  const channelNames = items.map((item) => cleanText(item.channel).toLowerCase()).filter(Boolean);
  const values = [...tokens, ...channelNames];
  const counts = countValues(values);
  const value = entropyDiversityScore(counts);

  return metric(
    "visible_feed_entropy",
    "Feed entropy",
    value,
    values.length > 0
      ? [`${new Set(values).size} unique local signals across ${values.length} observations`]
      : ["Not enough visible text"],
  );
}

export function calculateSourceDiversity(items: FeedItem[]) {
  const channels = items.map((item) => cleanText(item.channel).toLowerCase()).filter(Boolean);
  const uniqueChannels = new Set(channels);
  const value = items.length === 0 ? 0 : clampScore((uniqueChannels.size / items.length) * 100);

  return metric(
    "source_diversity",
    "Source diversity",
    value,
    channels.length > 0
      ? [`${uniqueChannels.size} unique channel${uniqueChannels.size === 1 ? "" : "s"}`]
      : ["No visible channel names"],
  );
}

export function calculateTitleHookDensity(items: FeedItem[]) {
  if (items.length === 0) {
    return metric("title_hook_density", "Hook density", 0, ["No visible titles"]);
  }

  const hookedTitles = items.filter((item) => titleHookScore(item.title) > 0);
  const value = clampScore((hookedTitles.length / items.length) * 100);

  return metric(
    "title_hook_density",
    "Hook density",
    value,
    hookedTitles.length > 0
      ? hookedTitles.slice(0, 3).map((item) => cleanText(item.title))
      : ["No strong title hooks detected"],
  );
}

export function topicTokens(value: string) {
  return tokenizeText(value, { minLength: 4, stopWords });
}

function titleHookScore(title: string) {
  const keywordHits = countPhraseHits(title, hookWords);
  const punctuationHits = (title.match(/[!?]/g) ?? []).length;
  const numberHits = (title.match(/\d/g) ?? []).length;
  const uppercaseLetters = title.match(/[A-Z]/g)?.length ?? 0;
  const letters = title.match(/[A-Za-z]/g)?.length ?? 1;
  const uppercaseRatio = uppercaseLetters / letters;

  return keywordHits + punctuationHits + Math.min(numberHits, 3) * 0.25 + (uppercaseRatio > 0.35 ? 1 : 0);
}

function metric(id: string, label: string, value: number, evidence: string[]): LocalMeasure {
  return {
    id,
    label,
    value,
    level: levelFor(value),
    evidence,
  };
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function topEntries(counts: Map<string, number>) {
  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, 3);
}

function totalCount(counts: Map<string, number>) {
  return [...counts.values()].reduce((sum, count) => sum + count, 0);
}

function concentrationScore(counts: Map<string, number>, denominator: number) {
  if (counts.size === 0 || denominator === 0) {
    return 0;
  }

  const maxCount = Math.max(...counts.values());

  return clampScore((maxCount / denominator) * 100);
}

function entropyDiversityScore(counts: Map<string, number>) {
  const total = totalCount(counts);

  if (counts.size <= 1 || total === 0) {
    return 0;
  }

  const entropy = [...counts.values()].reduce((sum, count) => {
    const probability = count / total;

    return sum - probability * Math.log2(probability);
  }, 0);
  const maxEntropy = Math.log2(counts.size);

  return clampScore((entropy / maxEntropy) * 100);
}

function levelFor(value: number): LocalMeasureLevel {
  if (value >= 67) {
    return "high";
  }

  if (value >= 34) {
    return "moderate";
  }

  return "low";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
