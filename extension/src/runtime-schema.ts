import type { AttentionSignalSummary } from "./attention-signals";
import type { FeedItem } from "./feed-item";

export const MAX_PERSISTED_FEED_ITEMS = 60;
export const MAX_PERSISTED_URL_LENGTH = 2_048;
export const MAX_PERSISTED_NOTE_LENGTH = 500;

const MAX_TITLE_LENGTH = 300;
const MAX_CHANNEL_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_DURATION_LENGTH = 32;
const MAX_IDENTIFIER_LENGTH = 200;
const MAX_PLATFORM_LENGTH = 80;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_METADATA_JSON_LENGTH = 4_096;
const MAX_ATTENTION_SIGNALS = 10;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFeedItem(value: unknown): value is FeedItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isBoundedString(value.title, MAX_TITLE_LENGTH) &&
    isBoundedString(value.channel, MAX_CHANNEL_LENGTH) &&
    isBoundedString(value.description, MAX_DESCRIPTION_LENGTH) &&
    isBoundedString(value.duration, MAX_DURATION_LENGTH) &&
    isBoundedString(value.url, MAX_PERSISTED_URL_LENGTH) &&
    isOptionalBoundedString(value.id, MAX_IDENTIFIER_LENGTH) &&
    isOptionalBoundedString(value.platform, MAX_PLATFORM_LENGTH) &&
    isOptionalBoundedString(value.timestamp, MAX_TIMESTAMP_LENGTH) &&
    (value.metadata === undefined || isBoundedSerializableRecord(value.metadata))
  );
}

export function isPersistableFeedItems(value: unknown): value is FeedItem[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_PERSISTED_FEED_ITEMS &&
    value.every(isFeedItem)
  );
}

export function assertPersistableFeedItems(
  value: unknown,
): asserts value is FeedItem[] {
  if (!isPersistableFeedItems(value)) {
    throw new TypeError("Feed items exceed persistence boundaries.");
  }
}

export function assertBoundedString(
  value: unknown,
  maximum: number,
  field: string,
): asserts value is string {
  if (!isBoundedString(value, maximum)) {
    throw new TypeError(`${field} exceeds persistence boundaries.`);
  }
}

export function isAttentionSignalSummary(value: unknown): value is AttentionSignalSummary {
  if (
    !isRecord(value) ||
    !isNonNegativeNumber(value.itemCount) ||
    value.itemCount > MAX_PERSISTED_FEED_ITEMS ||
    !Array.isArray(value.signals) ||
    value.signals.length > MAX_ATTENTION_SIGNALS
  ) {
    return false;
  }

  return value.signals.every(
    (signal) =>
      isRecord(signal) &&
      isBoundedString(signal.id, 80) &&
      isBoundedString(signal.label, 100) &&
      isFiniteNumber(signal.value) &&
      signal.value >= 0 &&
      signal.value <= 100 &&
      (signal.level === "low" || signal.level === "moderate" || signal.level === "high") &&
      isBoundedString(signal.evidence, 500),
  );
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isBoundedString(value: unknown, maximum: number): value is string {
  return isString(value) && value.length <= maximum;
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isOptionalBoundedString(
  value: unknown,
  maximum: number,
): value is string | undefined {
  return value === undefined || isBoundedString(value, maximum);
}

function isBoundedSerializableRecord(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  try {
    return JSON.stringify(value).length <= MAX_METADATA_JSON_LENGTH;
  } catch {
    return false;
  }
}
