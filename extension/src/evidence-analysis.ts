import { cleanText, type FeedItem } from "./feed-item";

export const MAX_EVIDENCE_QUERY_LENGTH = 180;

export type VisibleEvidenceSignals = {
  citationLanguageVisible: boolean;
  identifierVisible: boolean;
  independentReportingMentions: string[];
  primarySourceMentions: string[];
};

const CITATION_LANGUAGE = [
  /\baccording to\b/i,
  /\bbased on\b/i,
  /\b(?:data|report|research|study) (?:from|by)\b/i,
  /(?:根据|援引|来源|报告显示|研究显示|数据显示|据(?:官方|报告|研究|数据|统计|路透社|美联社|法新社|新华社))/u,
];

const PRIMARY_SOURCE_PATTERNS = [
  { label: "WHO", pattern: /\bWHO\b|世界卫生组织/iu },
  { label: "World Bank", pattern: /\bWorld Bank\b|世界银行/iu },
  { label: "IMF", pattern: /\bIMF\b|国际货币基金组织/iu },
  { label: "OECD", pattern: /\bOECD\b|经济合作与发展组织/iu },
  { label: "Eurostat", pattern: /\bEurostat\b|欧盟统计局/iu },
  { label: "United Nations", pattern: /\bUnited Nations\b|\bUN Data\b|联合国/iu },
] as const;

const INDEPENDENT_REPORTING_PATTERNS = [
  { label: "Reuters", pattern: /\bReuters\b|路透社/iu },
  { label: "Associated Press", pattern: /\bAssociated Press\b|\bAP News\b|美联社/iu },
  { label: "AFP", pattern: /\bAFP\b|Agence France-Presse|法新社/iu },
] as const;

export function deriveEvidenceQuery(item: FeedItem) {
  const title = removeDurationNoise(cleanText(item.title), item.duration)
    .replace(/[|｜:：,，;；]+/gu, " ")
    .replace(/[!?！？]+$/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const fallback = cleanText(item.description)
    .replace(/https?:\/\/\S+/giu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (title || fallback).slice(0, MAX_EVIDENCE_QUERY_LENGTH).trim();
}

export function detectVisibleEvidenceSignals(
  item: FeedItem,
): VisibleEvidenceSignals {
  const visibleText = cleanText(
    [item.title, item.channel, item.description].filter(Boolean).join(" "),
  );

  return {
    citationLanguageVisible: CITATION_LANGUAGE.some((pattern) =>
      pattern.test(visibleText),
    ),
    identifierVisible:
      /https?:\/\/\S+/iu.test(visibleText) ||
      /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/iu.test(visibleText),
    independentReportingMentions: matchLabels(
      visibleText,
      INDEPENDENT_REPORTING_PATTERNS,
    ),
    primarySourceMentions: matchLabels(visibleText, PRIMARY_SOURCE_PATTERNS),
  };
}

function removeDurationNoise(title: string, duration: string) {
  let cleaned = title;
  const normalizedDuration = cleanText(duration);

  if (normalizedDuration && cleaned.endsWith(normalizedDuration)) {
    cleaned = cleaned.slice(0, -normalizedDuration.length);
  }

  return cleaned
    .replace(/\s+\d{1,2}:\d{2}(?::\d{2})?$/u, "")
    .replace(/\s+\d+\s*(?:小时|分鐘|分钟|分)\s*\d*\s*(?:秒)?$/u, "")
    .trim();
}

function matchLabels(
  text: string,
  patterns: ReadonlyArray<{ label: string; pattern: RegExp }>,
) {
  return patterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
}
