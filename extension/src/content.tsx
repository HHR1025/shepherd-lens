import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { calculateAttentionSignals } from "./attention-signals";
import { compareFeedDrift, type DriftComparison } from "./drift-comparison";
import { extractVisibleFeedItems, normalizeKey, type FeedItem } from "./feed-extractor";
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
import styles from "./sidebar.css?inline";

const HOST_ID = "shepherd-lens-sidebar-root";
const FEED_UPDATE_EVENT = "shepherd-lens-feed-update";
const HISTORY_UPDATE_EVENT = "shepherd-lens-history-update";
const UI_VERSION = "stage-8-drift-comparison";
const MAX_VISIBLE_FEED_ITEMS = 60;

type FeedUpdateEvent = CustomEvent<FeedItem[]>;
type HistoryUpdateEvent = CustomEvent<HistoryState>;

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

console.info("[Shepherd Lens] content script loaded", window.location.href);

function publishFeedItems() {
  latestFeedItems = extractVisibleFeedItems(document, MAX_VISIBLE_FEED_ITEMS);
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
  const { language, toggleLanguage } = useSidebarLanguage();
  const copy = getCopy(language);
  const feedItems = useFeedItems();
  const { history, status: historyStatus } = useHistoryStatus();
  const sampleItems = useMemo(() => feedItems.slice(0, 5), [feedItems]);
  const signalSummary = useMemo(() => calculateAttentionSignals(feedItems), [feedItems]);
  const driftComparison = useMemo(
    () => compareFeedDrift(feedItems, history.snapshots),
    [feedItems, history.snapshots],
  );
  const status = feedItems.length > 0 ? copy.watchingPage : copy.scanningPage;
  const stats = useMemo(
    () => [
      { label: copy.visibleFeed, value: formatItemCount(feedItems.length, language) },
      { label: copy.extraction, value: status },
      { label: copy.snapshots, value: `${historyStatus.snapshotCount}` },
      {
        label: copy.lastSaved,
        value: formatLastSnapshot(historyStatus.lastSnapshotAt, {
          notSavedYet: copy.notSavedYet,
          unknown: copy.unknown,
        }),
      },
    ],
    [
      copy.extraction,
      copy.lastSaved,
      copy.notSavedYet,
      copy.snapshots,
      copy.unknown,
      copy.visibleFeed,
      feedItems.length,
      historyStatus.lastSnapshotAt,
      historyStatus.snapshotCount,
      language,
      status,
    ],
  );

  return (
    <motion.aside
      className="fixed right-4 top-24 z-[2147483647] flex items-start gap-2 font-sans text-stone-50"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/55 text-stone-300 shadow-lg backdrop-blur-md transition hover:bg-black/75 hover:text-white"
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
            className="w-[286px] overflow-hidden rounded-xl border border-white/10 bg-[#111111]/82 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.36)] backdrop-blur-xl"
            initial={{ opacity: 0, x: 14, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="space-y-4">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-stone-400">
                    {copy.brand}
                  </p>
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

              <section className="divide-y divide-white/8 rounded-lg border border-white/8 bg-white/[0.035]">
                {stats.map((signal, index) => (
                  <motion.div
                    className="flex items-center justify-between gap-4 px-3 py-3"
                    key={signal.label}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + index * 0.04, duration: 0.2 }}
                  >
                    <p className="text-[12px] text-stone-400">
                      {signal.label}
                    </p>
                    <p className="text-right text-[13px] font-medium text-stone-100">
                      {signal.value}
                    </p>
                  </motion.div>
                ))}
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between text-[11px] text-stone-500">
                  <span>{copy.localSignals}</span>
                  <span>{copy.heuristic}</span>
                </div>
                <div className="space-y-2">
                  {signalSummary.signals.map((signal) => (
                    <div className="space-y-1.5" key={signal.id}>
                      <div className="flex items-center justify-between gap-3 text-[12px]">
                        <span className="text-stone-400">
                          {copy.signalLabels[signal.id] ?? signal.label}
                        </span>
                        <span className="font-medium text-stone-100">
                          {signal.value}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-stone-300"
                          animate={{ width: `${signal.value}%` }}
                          transition={{ duration: 0.38, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <DriftPanel comparison={driftComparison} language={language} />

              <section>
                <div className="mb-2 flex items-center justify-between text-[11px] text-stone-500">
                  <span>{copy.sampleTitles}</span>
                  <span>{sampleItems.length}/5</span>
                </div>
                {sampleItems.length > 0 ? (
                  <ol className="space-y-2">
                    {sampleItems.map((item, index) => (
                      <motion.li
                        className="line-clamp-2 rounded-lg bg-white/[0.035] px-3 py-2 text-[12px] leading-4 text-stone-200"
                        key={normalizeKey(item)}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 + index * 0.03, duration: 0.18 }}
                        title={item.title}
                      >
                        {item.title}
                      </motion.li>
                    ))}
                  </ol>
                ) : (
                  <p className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3 text-[12px] text-stone-500">
                    {copy.emptyRecommendations}
                  </p>
                )}
              </section>

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
    <section>
      <div className="mb-2 flex items-center justify-between text-[11px] text-stone-500">
        <span>{copy.drift.heading}</span>
        <span>
          {comparison.baselineAvailable ? copy.drift.previousSnapshot : copy.drift.waiting}
        </span>
      </div>
      <div className="space-y-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3">
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="text-stone-400">{copy.drift.heading}</span>
          <span className="text-right font-medium text-stone-100">{summary}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="text-stone-500">{copy.drift.comparedWith}</span>
          <span className="text-right text-stone-300">
            {comparison.baselineAvailable ? copy.drift.previousSnapshot : copy.drift.waiting}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="text-stone-500">{copy.drift.repeatedChannels}</span>
          <span className="max-w-[150px] truncate text-right text-stone-300">
            {repeatedChannels}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="text-stone-500">{copy.drift.topicLoops}</span>
          <span className="max-w-[150px] truncate text-right text-stone-300">
            {repeatedTopics}
          </span>
        </div>
      </div>
    </section>
  );
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

  return activeChanges
    .slice(0, 2)
    .map((change) => {
      const signalName = copy.drift.signalNames[change.id] ?? change.label.toLowerCase();
      const direction = copy.drift.directions[change.direction];

      return language === "zh" ? `${signalName}${direction}` : `${signalName} ${direction}`;
    })
    .join(language === "zh" ? "，" : ", ");
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
      width: 286px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: rgba(17, 17, 17, 0.82);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.36);
      color: #fafaf9;
      font: 14px Inter, ui-sans-serif, system-ui, sans-serif;
      padding: 16px;
    ">
      <div style="font-size: 11px; color: rgba(214, 211, 209, .72);">
        Shepherd Lens
      </div>
      <div style="margin-top: 4px; font-size: 16px; font-weight: 650;">Attention signals</div>
      <div style="margin-top: 14px; opacity: .62;">calculating local heuristics...</div>
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

window.addEventListener("yt-navigate-finish", scheduleInjection);
window.addEventListener("yt-page-data-updated", scheduleInjection);
window.addEventListener("popstate", scheduleInjection);
window.addEventListener("scroll", () => scheduleFeedExtraction(180), { passive: true });
window.addEventListener("resize", () => scheduleFeedExtraction(180));

const observer = new MutationObserver(() => {
  if (!document.getElementById(HOST_ID)) {
    scheduleInjection();
  }

  scheduleFeedExtraction(220);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
