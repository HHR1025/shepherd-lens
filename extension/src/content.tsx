import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { calculateAttentionSignals } from "./attention-signals";
import { compareFeedDrift, type DriftComparison } from "./drift-comparison";
import { normalizeKey, type FeedItem } from "./feed-item";
import {
  getHistoryStatus,
  readHistory,
  saveHistorySnapshot,
  type HistoryState,
  type HistoryStatus,
} from "./history-tracking";
import {
  formatItemCount,
  getCopy,
  LANGUAGE_STORAGE_KEY,
  nextLanguage,
  normalizeLanguage,
  type SidebarLanguage,
} from "./localization";
import { calculateLocalMeasurements, type LocalMeasurementSummary } from "./local-measurements";
import { getActivePlatformAdapter } from "./platforms";
import styles from "./sidebar.css?inline";

const HOST_ID = "shepherd-lens-sidebar-root";
const FEED_UPDATE_EVENT = "shepherd-lens-feed-update";
const HISTORY_UPDATE_EVENT = "shepherd-lens-history-update";
const UI_VERSION = "stage-11-progressive-disclosure";
const MAX_VISIBLE_FEED_ITEMS = 60;
const POSITION_STORAGE_KEY = "shepherdLensSidebarPosition";
const DEFAULT_SIDEBAR_POSITION = {
  left: 1580,
  top: 96,
};
const SIDEBAR_WIDTH = 360;
const SIDEBAR_MIN_VISIBLE = 56;

type FeedUpdateEvent = CustomEvent<FeedItem[]>;
type HistoryUpdateEvent = CustomEvent<HistoryState>;
type SidebarView = "overview" | "evidence";
type SidebarPosition = {
  left: number;
  top: number;
};

let extractionTimer: number | undefined;
let latestFeedItems: FeedItem[] = [];
let latestHistoryState: HistoryState = {
  snapshots: [],
};
let latestHistoryStatus: HistoryStatus = {
  snapshotCount: 0,
  lastSnapshotAt: null,
};
let saveInFlight = false;
const activePlatformAdapter = getActivePlatformAdapter();

console.info(
  "[Shepherd Lens] content script loaded",
  activePlatformAdapter.getPlatformMetadata(),
);

function publishFeedItems() {
  latestFeedItems = activePlatformAdapter.extractVisibleItems(document, MAX_VISIBLE_FEED_ITEMS);
  Object.assign(window, {
    __SHEPHERD_LENS_FEED__: latestFeedItems,
  });
  window.dispatchEvent(
    new CustomEvent<FeedItem[]>(FEED_UPDATE_EVENT, {
      detail: latestFeedItems,
    }),
  );
  void persistHistorySnapshot(latestFeedItems);
}

function scheduleFeedExtraction(delay = 120) {
  if (extractionTimer) {
    window.clearTimeout(extractionTimer);
  }

  extractionTimer = window.setTimeout(publishFeedItems, delay);
}

function useFeedItems() {
  const [items, setItems] = useState<FeedItem[]>(latestFeedItems);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      setItems((event as FeedUpdateEvent).detail);
    };

    window.addEventListener(FEED_UPDATE_EVENT, handleUpdate);
    scheduleFeedExtraction(0);

    return () => window.removeEventListener(FEED_UPDATE_EVENT, handleUpdate);
  }, []);

  return items;
}

function useHistoryStatus() {
  const [history, setHistory] = useState<HistoryState>(latestHistoryState);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      setHistory((event as HistoryUpdateEvent).detail);
    };

    window.addEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
    void refreshHistoryStatus();

    return () => window.removeEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
  }, []);

  return {
    history,
    status: getHistoryStatus(history),
  };
}

async function refreshHistoryStatus() {
  const storage = getChromeStorage();

  if (!storage) {
    return;
  }

  const history = await readHistory(storage);
  publishHistoryState(history);
}

async function persistHistorySnapshot(feedItems: FeedItem[]) {
  const storage = getChromeStorage();

  if (!storage || saveInFlight) {
    return;
  }

  saveInFlight = true;

  try {
    const result = await saveHistorySnapshot(storage, feedItems, window.location.href);
    publishHistoryState(result.history);
  } finally {
    saveInFlight = false;
  }
}

function publishHistoryState(history: HistoryState) {
  latestHistoryState = history;
  latestHistoryStatus = getHistoryStatus(history);
  Object.assign(window, {
    __SHEPHERD_LENS_HISTORY__: latestHistoryStatus,
  });
  window.dispatchEvent(
    new CustomEvent<HistoryState>(HISTORY_UPDATE_EVENT, {
      detail: latestHistoryState,
    }),
  );
}

function getChromeStorage() {
  if (typeof chrome === "undefined") {
    return null;
  }

  return chrome.storage?.local ?? null;
}

function useSidebarLanguage() {
  const [language, setLanguage] = useState<SidebarLanguage>("en");

  useEffect(() => {
    const storage = getChromeStorage();

    if (!storage) {
      return;
    }

    let active = true;

    storage.get([LANGUAGE_STORAGE_KEY]).then((result) => {
      if (active) {
        setLanguage(normalizeLanguage(result[LANGUAGE_STORAGE_KEY]));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const toggleLanguage = () => {
    setLanguage((currentLanguage) => {
      const updatedLanguage = nextLanguage(currentLanguage);
      const storage = getChromeStorage();

      void storage?.set({
        [LANGUAGE_STORAGE_KEY]: updatedLanguage,
      });

      return updatedLanguage;
    });
  };

  return { language, toggleLanguage };
}

function useSidebarPosition() {
  const [position, setPosition] = useState<SidebarPosition>(() =>
    clampSidebarPosition({
      left: window.innerWidth - SIDEBAR_WIDTH - 16,
      top: DEFAULT_SIDEBAR_POSITION.top,
    }),
  );

  useEffect(() => {
    const storage = getChromeStorage();

    if (!storage) {
      return;
    }

    let active = true;

    storage.get([POSITION_STORAGE_KEY]).then((result) => {
      const savedPosition = normalizeSidebarPosition(result[POSITION_STORAGE_KEY]);

      if (active && savedPosition) {
        setPosition(clampSidebarPosition(savedPosition));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((currentPosition) => {
        const nextPosition = clampSidebarPosition(currentPosition);

        void saveSidebarPosition(nextPosition);

        return nextPosition;
      });
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const moveBy = (deltaX: number, deltaY: number) => {
    setPosition((currentPosition) => {
      const nextPosition = clampSidebarPosition({
        left: currentPosition.left + deltaX,
        top: currentPosition.top + deltaY,
      });

      void saveSidebarPosition(nextPosition);

      return nextPosition;
    });
  };

  return { moveBy, position };
}

async function saveSidebarPosition(position: SidebarPosition) {
  const storage = getChromeStorage();

  await storage?.set({
    [POSITION_STORAGE_KEY]: position,
  });
}

function normalizeSidebarPosition(value: unknown): SidebarPosition | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const position = value as SidebarPosition;

  if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) {
    return null;
  }

  return position;
}

function clampSidebarPosition(position: SidebarPosition): SidebarPosition {
  const maxLeft = Math.max(SIDEBAR_MIN_VISIBLE, window.innerWidth - SIDEBAR_MIN_VISIBLE);
  const maxTop = Math.max(16, window.innerHeight - SIDEBAR_MIN_VISIBLE);

  return {
    left: Math.min(Math.max(-SIDEBAR_WIDTH + SIDEBAR_MIN_VISIBLE, position.left), maxLeft),
    top: Math.min(Math.max(16, position.top), maxTop),
  };
}

function isInteractiveDragTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, select, textarea"));
}

function formatLastSnapshot(
  timestamp: string | null,
  fallback: { notSavedYet: string; unknown: string },
) {
  if (!timestamp) {
    return fallback.notSavedYet;
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return fallback.unknown;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AtmosphereSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>("overview");
  const { moveBy, position } = useSidebarPosition();
  const { language, toggleLanguage } = useSidebarLanguage();
  const copy = getCopy(language);
  const feedItems = useFeedItems();
  const { history, status: historyStatus } = useHistoryStatus();
  const sampleItems = useMemo(() => feedItems.slice(0, 5), [feedItems]);
  const signalSummary = useMemo(() => calculateAttentionSignals(feedItems), [feedItems]);
  const localMeasurements = useMemo(() => calculateLocalMeasurements(feedItems), [feedItems]);
  const driftComparison = useMemo(
    () => compareFeedDrift(feedItems, history.snapshots),
    [feedItems, history.snapshots],
  );
  const status = feedItems.length > 0 ? copy.watchingPage : copy.scanningPage;
  const attentionSummary = getAttentionClimate(signalSummary.signals, copy);
  const diversitySummary = getFeedDiversity(localMeasurements, copy);
  const driftSummary = formatDriftSummary(driftComparison, language);
  const lastSaved = formatLastSnapshot(historyStatus.lastSnapshotAt, {
    notSavedYet: copy.notSavedYet,
    unknown: copy.unknown,
  });

  return (
    <motion.aside
      className="fixed z-[2147483647] flex items-start gap-2 font-sans text-stone-50"
      style={{ left: position.left, top: position.top }}
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/55 text-stone-300 shadow-lg backdrop-blur-md transition hover:bg-black/75 hover:text-white"
        type="button"
        aria-label={collapsed ? copy.expand : copy.collapse}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <motion.span
          className="block text-sm leading-none"
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {collapsed ? "L" : "x"}
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="max-h-[calc(100vh-120px)] w-[320px] overflow-hidden rounded-xl border border-white/10 bg-[#111111]/84 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.36)] backdrop-blur-xl"
            initial={{ opacity: 0, x: 14, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="max-h-[calc(100vh-152px)] space-y-4 overflow-y-auto pr-1">
              <header
                className="flex cursor-move touch-none select-none items-start justify-between gap-3"
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }

                  if (isInteractiveDragTarget(event.target)) {
                    return;
                  }

                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                    return;
                  }

                  moveBy(event.movementX, event.movementY);
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
              >
                <div>
                  <p className="text-[11px] font-medium text-stone-400">{copy.brand}</p>
                  <h1 className="mt-1 text-base font-semibold leading-6 text-stone-50">
                    {copy.heading}
                  </h1>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-medium text-stone-300 transition hover:bg-white/10 hover:text-stone-50"
                    type="button"
                    aria-label={copy.languageToggle}
                    onClick={toggleLanguage}
                  >
                    {language === "en" ? "中" : "EN"}
                  </button>
                  <div className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-medium text-stone-300">
                    {copy.prototype}
                  </div>
                </div>
              </header>

              <ViewTabs activeView={activeView} language={language} onChange={setActiveView} />

              {activeView === "overview" ? (
                <section className="space-y-2">
                  <SummaryDisclosure
                    defaultOpen
                    detail={copy.heuristic}
                    label={copy.overview.attentionClimate}
                    value={attentionSummary}
                  >
                    <SignalList signalSummary={signalSummary} language={language} />
                  </SummaryDisclosure>

                  <SummaryDisclosure
                    detail={copy.overview.partial}
                    label={copy.overview.feedDiversity}
                    value={diversitySummary}
                  >
                    <div className="space-y-4">
                      <LocalMeasuresPanel summary={localMeasurements} language={language} />
                      <div>
                        <div className="mb-2 flex items-center justify-between text-[11px] text-stone-500">
                          <span>{copy.sections.samples}</span>
                          <span>{sampleItems.length}/5</span>
                        </div>
                        <SampleList emptyCopy={copy.emptyRecommendations} items={sampleItems} />
                      </div>
                    </div>
                  </SummaryDisclosure>

                  <SummaryDisclosure
                    detail={
                      driftComparison.baselineAvailable
                        ? copy.drift.previousSnapshot
                        : copy.drift.waiting
                    }
                    label={copy.overview.driftSummary}
                    value={driftSummary}
                  >
                    <DriftPanel comparison={driftComparison} language={language} />
                  </SummaryDisclosure>

                  <SummaryDisclosure
                    detail={`${historyStatus.snapshotCount} ${copy.snapshots}`}
                    label={copy.overview.localStatus}
                    priority="low"
                    value={formatItemCount(feedItems.length, language)}
                  >
                    <KeyValueList
                      items={[
                        {
                          label: copy.visibleFeed,
                          value: formatItemCount(feedItems.length, language),
                        },
                        { label: copy.extraction, value: status },
                        { label: copy.snapshots, value: `${historyStatus.snapshotCount}` },
                        { label: copy.lastSaved, value: lastSaved },
                      ]}
                    />
                  </SummaryDisclosure>
                </section>
              ) : (
                <EvidencePlaceholder language={language} />
              )}

              <div>
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>{copy.model}</span>
                  <span>{copy.localOnly}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-stone-300"
                    initial={{ width: "12%" }}
                    animate={{ width: signalSummary.itemCount > 0 ? "72%" : "28%" }}
                    transition={{ duration: 0.65, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function SummaryDisclosure({
  children,
  defaultOpen = false,
  detail,
  label,
  priority = "normal",
  value,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  detail: string;
  label: string;
  priority?: "normal" | "low";
  value: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const muted = priority === "low";

  return (
    <section
      className={[
        "overflow-hidden rounded-lg border transition",
        muted
          ? "border-white/[0.055] bg-white/[0.018]"
          : "border-white/8 bg-white/[0.035]",
      ].join(" ")}
    >
      <button
        className="flex w-full items-start justify-between gap-3 px-3 py-3.5 text-left transition hover:bg-white/[0.035]"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="min-w-0 flex-1">
          <div
            className={[
              "leading-4",
              muted ? "text-[11px] text-stone-600" : "text-[11px] text-stone-500",
            ].join(" ")}
          >
            {label}
          </div>
          <div
            className={[
              "mt-1 break-words text-[13px] font-semibold leading-[18px]",
              muted ? "text-stone-300" : "text-stone-100",
            ].join(" ")}
          >
            {value}
          </div>
          <div className="mt-1 min-h-3 truncate text-[10px] leading-3 text-stone-600">
            {detail}
          </div>
        </div>
        <motion.span
          className="mt-5 shrink-0 text-[11px] text-stone-500"
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18 }}
        >
          &gt;
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="border-t border-white/8 px-3 py-3"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ViewTabs({
  activeView,
  language,
  onChange,
}: {
  activeView: SidebarView;
  language: SidebarLanguage;
  onChange: (view: SidebarView) => void;
}) {
  const copy = getCopy(language);

  return (
    <div className="grid grid-cols-2 rounded-lg border border-white/8 bg-white/[0.025] p-1">
      {(["overview", "evidence"] as const).map((view) => (
        <button
          className={[
            "min-w-0 rounded-md px-2 py-1.5 text-[12px] font-medium leading-4 transition",
            activeView === view
              ? "bg-white/10 text-stone-100 shadow-sm"
              : "text-stone-500 hover:bg-white/[0.045] hover:text-stone-300",
          ].join(" ")}
          key={view}
          type="button"
          aria-pressed={activeView === view}
          onClick={() => onChange(view)}
        >
          {copy.views[view]}
        </button>
      ))}
    </div>
  );
}

function EvidencePlaceholder({ language }: { language: SidebarLanguage }) {
  const copy = getCopy(language);

  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-white/8 bg-white/[0.035] px-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-stone-500">{copy.evidence.confidence}</p>
            <p className="mt-2 text-[14px] font-semibold text-stone-100">
              {copy.evidence.waiting}
            </p>
          </div>
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-stone-400">
            {copy.evidence.notTruthScore}
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-5 text-stone-500">
          {copy.evidence.placeholder}
        </p>
      </div>

      <KeyValueList
        items={[
          { label: copy.evidence.primarySources, value: copy.evidence.comingSoon },
          { label: copy.evidence.independentReporting, value: copy.evidence.comingSoon },
          { label: copy.evidence.sourceDiversity, value: copy.evidence.comingSoon },
          { label: copy.evidence.sourceNavigation, value: copy.evidence.comingSoon },
        ]}
      />
    </section>
  );
}

function SignalList({
  language,
  signalSummary,
}: {
  language: SidebarLanguage;
  signalSummary: ReturnType<typeof calculateAttentionSignals>;
}) {
  const copy = getCopy(language);

  return (
    <div className="space-y-2">
      {signalSummary.signals.map((signal) => (
        <MetricBar
          key={signal.id}
          label={copy.signalLabels[signal.id] ?? signal.label}
          value={signal.value}
        />
      ))}
    </div>
  );
}

function LocalMeasuresPanel({
  language,
  summary,
}: {
  language: SidebarLanguage;
  summary: LocalMeasurementSummary;
}) {
  const copy = getCopy(language);

  return (
    <div className="space-y-2">
      {summary.metrics.map((metric) => (
        <MetricBar
          key={metric.id}
          label={copy.measureLabels[metric.id] ?? metric.label}
          meta={copy.levels[metric.level]}
          title={metric.evidence.join("\n")}
          value={metric.value}
        />
      ))}
    </div>
  );
}

function DriftPanel({
  comparison,
  language,
}: {
  comparison: DriftComparison;
  language: SidebarLanguage;
}) {
  const copy = getCopy(language);
  const summary = formatDriftSummary(comparison, language);
  const repeatedChannels = formatListOrEmpty(
    comparison.repeatedChannels,
    copy.drift.noneDetected,
  );
  const repeatedTopics = formatListOrEmpty(comparison.repeatedTopics, copy.drift.noneDetected);

  return (
    <KeyValueList
      items={[
        { label: copy.drift.heading, value: summary },
        {
          label: copy.drift.comparedWith,
          value: comparison.baselineAvailable ? copy.drift.previousSnapshot : copy.drift.waiting,
        },
        { label: copy.drift.repeatedChannels, value: repeatedChannels },
        { label: copy.drift.topicLoops, value: repeatedTopics },
      ]}
    />
  );
}

function MetricBar({
  label,
  meta,
  title,
  value,
}: {
  label: string;
  meta?: string;
  title?: string;
  value: number;
}) {
  return (
    <div className="space-y-1.5" title={title}>
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <span className="text-stone-400">{label}</span>
        <span className="font-medium text-stone-100">
          {value}
          {meta ? (
            <span className="ml-1 text-[10px] font-normal text-stone-500">{meta}</span>
          ) : null}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-stone-300"
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function KeyValueList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div className="flex items-center justify-between gap-3 text-[12px]" key={item.label}>
          <span className="text-stone-500">{item.label}</span>
          <span className="max-w-[156px] truncate text-right font-medium text-stone-200">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SampleList({
  emptyCopy,
  items,
}: {
  emptyCopy: string;
  items: FeedItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-[12px] text-stone-500">
        {emptyCopy}
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <motion.li
          className="line-clamp-2 rounded-lg bg-white/[0.035] px-3 py-2 text-[12px] leading-4 text-stone-200"
          key={normalizeKey(item)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 + index * 0.02, duration: 0.18 }}
          title={item.title}
        >
          {item.title}
        </motion.li>
      ))}
    </ol>
  );
}

function getAttentionClimate(
  signals: ReturnType<typeof calculateAttentionSignals>["signals"],
  copy: ReturnType<typeof getCopy>,
) {
  const stimulation = signals.find((signal) => signal.id === "stimulation")?.value ?? 0;
  const conflict = signals.find((signal) => signal.id === "conflict")?.value ?? 0;
  const pressure = Math.round((stimulation + conflict) / 2);

  if (pressure >= 67) {
    return copy.overview.active;
  }

  if (pressure >= 34) {
    return copy.levels.moderate;
  }

  return copy.overview.quiet;
}

function getFeedDiversity(summary: LocalMeasurementSummary, copy: ReturnType<typeof getCopy>) {
  const entropy = summary.metrics.find((metric) => metric.id === "visible_feed_entropy")?.value ?? 0;
  const sourceDiversity =
    summary.metrics.find((metric) => metric.id === "source_diversity")?.value ?? 0;
  const diversity = Math.round((entropy + sourceDiversity) / 2);

  if (diversity >= 67) {
    return copy.levels.high;
  }

  if (diversity >= 34) {
    return copy.levels.moderate;
  }

  return copy.levels.low;
}

function formatDriftSummary(comparison: DriftComparison, language: SidebarLanguage) {
  const copy = getCopy(language);

  if (!comparison.baselineAvailable) {
    return copy.drift.waiting;
  }

  const activeChanges = comparison.changes.filter((change) => change.direction !== "steady");

  if (activeChanges.length === 0) {
    return copy.drift.steady;
  }

  const parts = activeChanges.slice(0, 2).map((change) => {
    const signalName = copy.drift.signalNames[change.id] ?? change.label.toLowerCase();
    const direction = copy.drift.directions[change.direction];

    return language === "zh" ? `${signalName}${direction}` : `${signalName} ${direction}`;
  });

  return parts.join(language === "zh" ? "，" : ", ");
}

function formatListOrEmpty(items: string[], emptyCopy: string) {
  return items.length > 0 ? items.join(", ") : emptyCopy;
}

function injectSidebar() {
  const existingHost = document.getElementById(HOST_ID);

  if (existingHost?.dataset.shepherdLensVersion === UI_VERSION) {
    return;
  }

  if (existingHost) {
    existingHost.remove();
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.dataset.shepherdLensVersion = UI_VERSION;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = styles;

  const mount = document.createElement("div");
  mount.id = "shepherd-lens-react-root";
  mount.innerHTML = `
    <aside style="
      position: fixed;
      right: 16px;
      top: 96px;
      z-index: 2147483647;
      width: 320px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: rgba(17, 17, 17, 0.84);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.36);
      color: #fafaf9;
      font: 14px Inter, ui-sans-serif, system-ui, sans-serif;
      padding: 16px;
    ">
      <div style="font-size: 11px; color: rgba(214, 211, 209, .72);">
        Shepherd Lens
      </div>
      <div style="margin-top: 4px; font-size: 16px; font-weight: 650;">Feed observation</div>
      <div style="margin-top: 14px; opacity: .62;">organizing local signals...</div>
    </aside>
  `;

  shadow.append(style, mount);
  document.documentElement.appendChild(host);

  createRoot(mount).render(<AtmosphereSidebar />);

  try {
    const response = chrome.runtime?.sendMessage?.({ type: "SHEPHERD_LENS_READY" });

    if (response && typeof response.catch === "function") {
      response.catch(() => {
        // The UI can render even if the background worker is sleeping or unavailable.
      });
    }
  } catch {
    // Message passing is diagnostic only; keep the injected UI alive.
  }
}

function scheduleInjection() {
  window.requestAnimationFrame(injectSidebar);
  scheduleFeedExtraction();
}

scheduleInjection();

activePlatformAdapter.observeFeedChanges(scheduleInjection);
