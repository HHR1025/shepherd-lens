import React, { useMemo, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { calculateAttentionSignals } from "./attention-signals";
import { createBrowserRuntimePersistence } from "./browser-runtime-persistence";
import { compareFeedDrift, type DriftComparison } from "./drift-comparison";
import { ExtensionRuntime } from "./extension-runtime";
import { normalizeKey, type FeedItem } from "./feed-item";
import {
  createEmptyHistoryState,
  getHistoryStatus,
} from "./history-tracking";
import {
  formatItemCount,
  getCopy,
  type SidebarLanguage,
} from "./localization";
import { calculateLocalMeasurements, type LocalMeasurementSummary } from "./local-measurements";
import { getActivePlatformAdapter } from "./platforms";
import { analyzeSessionTimeline, type SessionTimelineSummary } from "./session-timeline";
import {
  formatDriftSummary,
  formatExperimentDeltas,
  formatLastSnapshot,
  formatListOrEmpty,
  formatSnapshotCount,
  getAttentionClimate,
  getExperimentCopy,
  getExperimentStatusDetail,
  getExperimentStatusValue,
  getFeedDiversity,
  getTimelineCopy,
  uniqueValues,
} from "./sidebar-presenter";
import {
  isInteractiveDragTarget,
  reportRuntimeError,
  useSidebarLanguage,
  useSidebarPosition,
} from "./sidebar-preferences";
import {
  createEmptyUserExperimentState,
  type ExperimentKind,
  type UserExperimentState,
} from "./user-experiment";
import styles from "./sidebar.css?inline";

const HOST_ID = "shepherd-lens-sidebar-root";
const UI_VERSION = "stage-11-progressive-disclosure";

type SidebarView = "overview" | "evidence";

let injectionFrame: number | undefined;
const activePlatformAdapter = getActivePlatformAdapter();

const extensionRuntime = activePlatformAdapter
  ? new ExtensionRuntime({
      adapter: activePlatformAdapter,
      getUrl: () => window.location.href,
      onError: reportRuntimeError,
      persistence: createBrowserRuntimePersistence(),
      root: document,
    })
  : null;
const EMPTY_RUNTIME_SNAPSHOT = {
  experiments: createEmptyUserExperimentState(),
  feedItems: [],
  history: createEmptyHistoryState(),
} satisfies ReturnType<ExtensionRuntime["getSnapshot"]>;

function getEmptyRuntimeSnapshot() {
  return EMPTY_RUNTIME_SNAPSHOT;
}

function noRuntimeSubscription() {
  return () => undefined;
}

function AtmosphereSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>("overview");
  const { moveBy, position } = useSidebarPosition();
  const { language, toggleLanguage } = useSidebarLanguage();
  const copy = getCopy(language);
  const runtimeSnapshot = useSyncExternalStore(
    extensionRuntime?.subscribe ?? noRuntimeSubscription,
    extensionRuntime?.getSnapshot ?? getEmptyRuntimeSnapshot,
    extensionRuntime?.getSnapshot ?? getEmptyRuntimeSnapshot,
  );
  const { experiments: experimentState, feedItems, history } = runtimeSnapshot;
  const historyStatus = getHistoryStatus(history);
  const sampleItems = useMemo(() => feedItems.slice(0, 5), [feedItems]);
  const signalSummary = useMemo(() => calculateAttentionSignals(feedItems), [feedItems]);
  const localMeasurements = useMemo(() => calculateLocalMeasurements(feedItems), [feedItems]);
  const driftComparison = useMemo(
    () => compareFeedDrift(feedItems, history.snapshots),
    [feedItems, history.snapshots],
  );
  const sessionTimeline = useMemo(
    () => analyzeSessionTimeline(feedItems, history.snapshots),
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
                    <DriftPanel
                      comparison={driftComparison}
                      language={language}
                      timeline={sessionTimeline}
                    />
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

                  <SummaryDisclosure
                    detail={getExperimentStatusDetail(experimentState, language)}
                    label={getExperimentCopy(language).heading}
                    priority="low"
                    value={getExperimentStatusValue(experimentState, language)}
                  >
                    <ExperimentPanel
                      language={language}
                      state={experimentState}
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
  timeline,
}: {
  comparison: DriftComparison;
  language: SidebarLanguage;
  timeline: SessionTimelineSummary;
}) {
  const copy = getCopy(language);
  const timelineCopy = getTimelineCopy(language);
  const summary = formatDriftSummary(comparison, language);
  const repeatedChannels = formatListOrEmpty(
    uniqueValues([...comparison.repeatedChannels, ...timeline.recurringChannels]),
    copy.drift.noneDetected,
  );
  const repeatedTopics = formatListOrEmpty(
    uniqueValues([...comparison.repeatedTopics, ...timeline.recurringTopics]),
    copy.drift.noneDetected,
  );

  return (
    <div className="space-y-4">
      <KeyValueList
        items={[
          { label: copy.drift.heading, value: summary },
          {
            label: copy.drift.comparedWith,
            value: comparison.baselineAvailable ? copy.drift.previousSnapshot : copy.drift.waiting,
          },
          {
            label: timelineCopy.sessionWindow,
            value: formatSnapshotCount(timeline.activeSessionSnapshots, language),
          },
          { label: copy.drift.repeatedChannels, value: repeatedChannels },
          { label: copy.drift.topicLoops, value: repeatedTopics },
        ]}
      />
      <div className="space-y-2">
        <MetricBar label={timelineCopy.sessionSimilarity} value={timeline.sessionSimilarity} />
        <MetricBar label={timelineCopy.topicSwitching} value={timeline.topicSwitchingSpeed} />
        <MetricBar label={timelineCopy.noveltyDecay} value={timeline.noveltyDecay} />
      </div>
    </div>
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

function ExperimentPanel({
  language,
  state,
}: {
  language: SidebarLanguage;
  state: UserExperimentState;
}) {
  const copy = getExperimentCopy(language);
  const [note, setNote] = useState("");
  const activeExperiment = state.activeExperiment;
  const latestExperiment = state.experiments.at(-1);

  const startExperiment = async (kind: ExperimentKind) => {
    if (!extensionRuntime) {
      return;
    }

    await extensionRuntime.startExperiment(kind, note);
    setNote("");
  };

  const completeExperiment = async () => {
    if (!extensionRuntime) {
      return;
    }

    await extensionRuntime.completeExperiment();
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-5 text-stone-500">{copy.description}</p>
      {activeExperiment ? (
        <div className="space-y-3">
          <KeyValueList
            items={[
              { label: copy.active, value: copy.kinds[activeExperiment.kind] },
              {
                label: copy.baseline,
                value: formatItemCount(activeExperiment.baseline.itemCount, language),
              },
            ]}
          />
          <button
            className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-[12px] font-medium text-stone-100 transition hover:bg-white/12"
            type="button"
            onClick={completeExperiment}
          >
            {copy.complete}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            className="min-h-16 w-full resize-none rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-[12px] leading-4 text-stone-200 outline-none transition placeholder:text-stone-600 focus:border-white/18"
            maxLength={120}
            placeholder={copy.notePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            {(["search", "watch", "ignore", "recovery"] as const).map((kind) => (
              <button
                className="rounded-lg border border-white/8 bg-white/[0.035] px-2 py-2 text-[11px] font-medium text-stone-300 transition hover:bg-white/10 hover:text-stone-100"
                key={kind}
                type="button"
                onClick={() => void startExperiment(kind)}
              >
                {copy.kinds[kind]}
              </button>
            ))}
          </div>
        </div>
      )}

      {latestExperiment ? (
        <div className="space-y-2 border-t border-white/8 pt-3">
          <div className="flex items-center justify-between text-[11px] text-stone-500">
            <span>{copy.latest}</span>
            <span>{copy.kinds[latestExperiment.kind]}</span>
          </div>
          {formatExperimentDeltas(latestExperiment.deltas, language).map((item) => (
            <div className="flex items-center justify-between gap-3 text-[12px]" key={item.label}>
              <span className="text-stone-500">{item.label}</span>
              <span className="font-medium text-stone-200">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
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

}

function scheduleInjection() {
  if (injectionFrame === undefined) {
    injectionFrame = window.requestAnimationFrame(() => {
      injectionFrame = undefined;
      injectSidebar();
    });
  }
}

if (activePlatformAdapter && extensionRuntime) {
  console.info(
    "[Shepherd Lens] content script loaded",
    activePlatformAdapter.getPlatformMetadata(),
  );
  extensionRuntime.start(scheduleInjection);
}
