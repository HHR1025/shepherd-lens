import React, { useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { createBrowserRuntimePersistence } from "./browser-runtime-persistence";
import { createBrowserEvidenceRetriever } from "./browser-evidence-retriever";
import { ExtensionRuntime } from "./extension-runtime";
import { createEmptyHistoryState } from "./history-tracking";
import { getCopy } from "./localization";
import { getActivePlatformAdapter } from "./platforms";
import { EvidenceView } from "./sidebar/evidence-view";
import { ViewTabs, type SidebarView } from "./sidebar/navigation";
import { OverviewView } from "./sidebar/overview-view";
import {
  isInteractiveDragTarget,
  reportRuntimeError,
  useSidebarLanguage,
  useSidebarPosition,
} from "./sidebar-preferences";
import {
  createEmptyUserExperimentState,
} from "./user-experiment";
import styles from "./sidebar.css?inline";

const HOST_ID = "shepherd-lens-sidebar-root";
const UI_VERSION = "stage-12-evidence-navigation";

let injectionFrame: number | undefined;
const activePlatformAdapter = getActivePlatformAdapter();
const evidenceRetriever = createBrowserEvidenceRetriever();

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
  observedAt: null,
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
  const {
    experiments: experimentState,
    feedItems,
    history,
    observedAt,
  } = runtimeSnapshot;

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
                <OverviewView
                  experimentState={experimentState}
                  feedItems={feedItems}
                  history={history}
                  language={language}
                  observedAt={observedAt}
                  onCompleteExperiment={async () => {
                    await extensionRuntime?.completeExperiment();
                  }}
                  onStartExperiment={async (kind, note) => {
                    await extensionRuntime?.startExperiment(kind, note);
                  }}
                  url={window.location.href}
                />
              ) : (
                <EvidenceView
                  feedItems={feedItems}
                  language={language}
                  retriever={evidenceRetriever}
                />
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
                    animate={{ width: feedItems.length > 0 ? "72%" : "28%" }}
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
