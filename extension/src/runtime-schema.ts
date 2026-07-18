import type { AttentionSignalSummary } from "./attention-signals";
import type { FeedItem } from "./feed-item";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFeedItem(value: unknown): value is FeedItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.title) &&
    isString(value.channel) &&
    isString(value.description) &&
    isString(value.duration) &&
    isString(value.url) &&
    isOptionalString(value.id) &&
    isOptionalString(value.platform) &&
    isOptionalString(value.timestamp) &&
    (value.metadata === undefined || isRecord(value.metadata))
  );
}

export function isAttentionSignalSummary(value: unknown): value is AttentionSignalSummary {
  if (!isRecord(value) || !isNonNegativeNumber(value.itemCount) || !Array.isArray(value.signals)) {
    return false;
  }

  return value.signals.every(
    (signal) =>
      isRecord(signal) &&
      isString(signal.id) &&
      isString(signal.label) &&
      isFiniteNumber(signal.value) &&
      (signal.level === "low" || signal.level === "moderate" || signal.level === "high") &&
      isString(signal.evidence),
  );
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
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

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}
