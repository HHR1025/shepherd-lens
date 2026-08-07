import { calculateAttentionSignals } from "./attention-signals";
import { cleanText, type FeedItem } from "./feed-item";
import { detectPageType, type HistoryState, type PageType } from "./history-tracking";
import { calculateLocalMeasurements } from "./local-measurements";
import {
  ALL_CALIBRATED_MEASUREMENT_IDS,
  type CalibratedMeasurementId,
  type CalibrationLanguage,
} from "./measurement-calibration";
import {
  createBlindedMeasurementPrompts,
  MEASUREMENT_VALIDATION_PROTOCOL_VERSION,
} from "./measurement-validation-study";

export const PILOT_EXPORT_SCHEMA_VERSION = 1 as const;
export const PILOT_CONSENT_NOTICE_VERSION = 1 as const;
export const MAX_PILOT_CASES = 20;
export const MAX_PILOT_ITEMS_PER_CASE = 50;

type PilotPageType = Exclude<PageType, "other">;

export type PilotResearchItem = {
  title: string;
  channel: string;
  duration: string;
  platform: string;
};

export type PilotResearchCase = {
  id: string;
  language: CalibrationLanguage;
  pageType: PilotPageType;
  observedOn: string;
  fingerprint: string;
  items: PilotResearchItem[];
};

export type PilotCoordinatorCase = PilotResearchCase & {
  localMeasurements: Record<CalibratedMeasurementId, number>;
};

export type PilotExportBundle = {
  schemaVersion: typeof PILOT_EXPORT_SCHEMA_VERSION;
  protocolVersion: typeof MEASUREMENT_VALIDATION_PROTOCOL_VERSION;
  exportId: string;
  createdAt: string;
  consent: {
    confirmed: true;
    noticeVersion: typeof PILOT_CONSENT_NOTICE_VERSION;
    scope: "local-user-initiated-export";
  };
  privacy: {
    processing: "local-only";
    omittedFields: string[];
    retainedFields: string[];
  };
  coordinator: {
    cases: PilotCoordinatorCase[];
  };
  blinded: {
    measurements: ReturnType<typeof createBlindedMeasurementPrompts>;
    cases: PilotResearchCase[];
  };
  limitations: string[];
};

type PilotExportInput = {
  consentConfirmed: boolean;
  currentFeedItems: readonly FeedItem[];
  currentObservedAt: string | null;
  currentUrl: string;
  history: HistoryState;
  createdAt?: Date;
};

export function createPilotExportBundle({
  consentConfirmed,
  currentFeedItems,
  currentObservedAt,
  currentUrl,
  history,
  createdAt = new Date(),
}: PilotExportInput): PilotExportBundle {
  if (!consentConfirmed) {
    throw new Error("Pilot export requires explicit confirmation.");
  }

  const candidates = [
    ...history.snapshots.map((snapshot) => ({
      feedItems: snapshot.feedItems,
      observedAt: snapshot.timestamp,
      pageType: snapshot.pageType,
    })),
    {
      feedItems: currentFeedItems,
      observedAt: currentObservedAt ?? createdAt.toISOString(),
      pageType: detectPageType(currentUrl),
    },
  ];
  const unique = new Map<string, Omit<PilotCoordinatorCase, "id">>();

  for (const candidate of candidates) {
    if (candidate.pageType === "other") {
      continue;
    }

    const sourceItems = candidate.feedItems.slice(0, MAX_PILOT_ITEMS_PER_CASE);
    const items = sourceItems.flatMap(redactItem);

    if (items.length === 0) {
      continue;
    }

    const feedKey = createRedactedFeedKey(items);
    unique.set(feedKey, {
      language: detectLanguage(items),
      pageType: candidate.pageType,
      observedOn: observationDate(candidate.observedAt, createdAt),
      fingerprint: hashString(feedKey),
      items,
      localMeasurements: calculateMeasurementRecord(sourceItems),
    });
  }

  const selected = [...unique.values()].slice(-MAX_PILOT_CASES);
  const coordinatorCases = selected.map((studyCase, index) => ({
    id: `case-${String(index + 1).padStart(3, "0")}`,
    ...studyCase,
  }));
  const blindedCases = coordinatorCases.map(createBlindedCase);
  const date = createdAt.toISOString();

  return {
    schemaVersion: PILOT_EXPORT_SCHEMA_VERSION,
    protocolVersion: MEASUREMENT_VALIDATION_PROTOCOL_VERSION,
    exportId: `pilot-${date.slice(0, 10).replaceAll("-", "")}`,
    createdAt: date,
    consent: {
      confirmed: true,
      noticeVersion: PILOT_CONSENT_NOTICE_VERSION,
      scope: "local-user-initiated-export",
    },
    privacy: {
      processing: "local-only",
      omittedFields: [
        "page and video URLs",
        "descriptions",
        "metadata",
        "item identifiers",
        "precise observation times",
      ],
      retainedFields: [
        "title",
        "channel",
        "duration",
        "platform",
        "observation date",
        "page type",
      ],
    },
    coordinator: { cases: coordinatorCases },
    blinded: {
      measurements: createBlindedMeasurementPrompts(),
      cases: blindedCases,
    },
    limitations: [
      "This export does not establish participant consent for anyone else.",
      "Titles and channel names remain visible because they are required for annotation.",
      "The bundle contains no completed independent ratings or scientific validation.",
    ],
  };
}

function createBlindedCase(studyCase: PilotCoordinatorCase): PilotResearchCase {
  return {
    id: studyCase.id,
    language: studyCase.language,
    pageType: studyCase.pageType,
    observedOn: studyCase.observedOn,
    fingerprint: studyCase.fingerprint,
    items: studyCase.items.map((item) => ({ ...item })),
  };
}

export function serializePilotExportBundle(bundle: PilotExportBundle) {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function pilotExportFilename(bundle: PilotExportBundle) {
  return `shepherd-lens-${bundle.exportId}.json`;
}

function redactItem(item: FeedItem): PilotResearchItem[] {
  const title = cleanText(item.title).slice(0, 300);

  if (!title) {
    return [];
  }

  return [{
    title,
    channel: cleanText(item.channel).slice(0, 200),
    duration: cleanText(item.duration).slice(0, 32),
    platform: cleanText(item.platform || "youtube").slice(0, 80),
  }];
}

function createRedactedFeedKey(items: PilotResearchItem[]) {
  return items
    .map((item) => `${item.title.toLocaleLowerCase()}::${item.channel.toLocaleLowerCase()}`)
    .sort()
    .join("|");
}

function observationDate(value: string, fallback: Date) {
  return Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString().slice(0, 10)
    : fallback.toISOString().slice(0, 10);
}

function hashString(value: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }

  return `${(first >>> 0).toString(16).padStart(8, "0")}${
    (second >>> 0).toString(16).padStart(8, "0")
  }`;
}

function detectLanguage(items: PilotResearchItem[]): CalibrationLanguage {
  const text = items.map((item) => `${item.title} ${item.channel}`).join(" ");
  const hasHan = /\p{Script=Han}/u.test(text);
  const hasLatin = /\p{Script=Latin}/u.test(text);

  if (hasHan && hasLatin) {
    return "mixed";
  }

  return hasHan ? "zh" : "en";
}

function calculateMeasurementRecord(
  items: FeedItem[],
): Record<CalibratedMeasurementId, number> {
  const measurements = [
    ...calculateAttentionSignals(items).signals,
    ...calculateLocalMeasurements(items).metrics,
  ];

  return Object.fromEntries(
    ALL_CALIBRATED_MEASUREMENT_IDS.map((id) => [
      id,
      measurements.find((measurement) => measurement.id === id)?.value ?? 0,
    ]),
  ) as Record<CalibratedMeasurementId, number>;
}
