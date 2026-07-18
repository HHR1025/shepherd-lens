import type { FeedItem } from "./feed-item";
import { countPhraseHits, tokenizeText } from "./text-analysis";

export type AttentionSignal = {
  id: string;
  label: string;
  value: number;
  level: "low" | "moderate" | "high";
  evidence: string;
};

export type AttentionSignalSummary = {
  itemCount: number;
  signals: AttentionSignal[];
};

const stimulationWords = [
  "amazing",
  "biggest",
  "breaking",
  "crazy",
  "exposed",
  "illegal",
  "insane",
  "mega",
  "secret",
  "shocking",
  "unbelievable",
  "you won't believe",
];

const conflictWords = [
  "battle",
  "collapse",
  "conflict",
  "crisis",
  "debate",
  "disaster",
  "exposed",
  "fight",
  "military",
  "scandal",
  "tensions",
  "versus",
  "vs",
  "war",
];

const stopWords = new Set([
  "and",
  "are",
  "for",
  "from",
  "have",
  "into",
  "that",
  "the",
  "this",
  "with",
  "you",
  "your",
]);

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelFor(value: number): AttentionSignal["level"] {
  if (value >= 67) {
    return "high";
  }

  if (value >= 34) {
    return "moderate";
  }

  return "low";
}

function titleText(items: FeedItem[]) {
  return items.map((item) => item.title).join(" ");
}

function tokenize(value: string) {
  return tokenizeText(value, { stopWords });
}

function parseDurationSeconds(duration: string) {
  const parts = duration
    .split(":")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

export function calculateStimulationDensity(items: FeedItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const text = titleText(items);
  const punctuation = (text.match(/[!?]/g) ?? []).length;
  const numbers = (text.match(/\d/g) ?? []).length;
  const uppercaseLetters = (text.match(/[A-Z]/g) ?? []).length;
  const letters = (text.match(/[A-Za-z]/g) ?? []).length || 1;
  const uppercaseRatio = uppercaseLetters / letters;
  const hooks = countPhraseHits(text, stimulationWords);
  const averageTitleLength =
    items.reduce((sum, item) => sum + item.title.length, 0) / items.length;

  return clampScore(
    hooks * 14 +
      punctuation * 7 +
      numbers * 1.6 +
      uppercaseRatio * 45 +
      Math.min(averageTitleLength, 80) * 0.28,
  );
}

export function calculateConflictSaturation(items: FeedItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const text = titleText(items);
  const hits = countPhraseHits(text, [...conflictWords, "against"]);

  return clampScore((hits / items.length) * 100);
}

export function calculateNoveltyProxy(items: FeedItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const tokens = tokenize(titleText(items));

  if (tokens.length === 0) {
    return 0;
  }

  const uniqueTokens = new Set(tokens);
  const uniqueChannels = new Set(items.map((item) => item.channel).filter(Boolean));
  const tokenVariety = uniqueTokens.size / tokens.length;
  const channelVariety = uniqueChannels.size / Math.max(items.length, 1);

  return clampScore(tokenVariety * 70 + channelVariety * 30);
}

export function calculateRepetitionDensity(items: FeedItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const tokens = tokenize(titleText(items));
  const repeatedTokens = tokens.length - new Set(tokens).size;
  const channelCounts = new Map<string, number>();

  for (const item of items) {
    if (item.channel) {
      channelCounts.set(item.channel, (channelCounts.get(item.channel) ?? 0) + 1);
    }
  }

  const repeatedChannels = [...channelCounts.values()].reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0,
  );

  return clampScore(
    (repeatedTokens / Math.max(tokens.length, 1)) * 70 +
      (repeatedChannels / items.length) * 30,
  );
}

export function calculateShortFormPressure(items: FeedItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const shortItems = items.filter((item) => {
    const durationSeconds = parseDurationSeconds(item.duration);

    return item.url.includes("/shorts/") || (durationSeconds !== null && durationSeconds <= 60);
  });

  return clampScore((shortItems.length / items.length) * 100);
}

function signal(
  id: string,
  label: string,
  value: number,
  evidence: string,
): AttentionSignal {
  return {
    id,
    label,
    value,
    level: levelFor(value),
    evidence,
  };
}

export function calculateAttentionSignals(items: FeedItem[]): AttentionSignalSummary {
  const stimulation = calculateStimulationDensity(items);
  const conflict = calculateConflictSaturation(items);
  const novelty = calculateNoveltyProxy(items);
  const repetition = calculateRepetitionDensity(items);
  const shortForm = calculateShortFormPressure(items);

  return {
    itemCount: items.length,
    signals: [
      signal("stimulation", "Stimulation", stimulation, "hooks, punctuation, title intensity"),
      signal("conflict", "Conflict", conflict, "conflict and crisis framing"),
      signal("novelty", "Novelty", novelty, "token and channel variety"),
      signal("repetition", "Repetition", repetition, "repeated terms and channels"),
      signal("short_form", "Short-form", shortForm, "short durations and Shorts URLs"),
    ],
  };
}
