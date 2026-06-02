import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { calculateAttentionSignals } from "./attention-signals";
import { extractVisibleFeedItems, normalizeKey, type FeedItem } from "./feed-extractor";
import styles from "./sidebar.css?inline";

const HOST_ID = "shepherd-lens-sidebar-root";
const FEED_UPDATE_EVENT = "shepherd-lens-feed-update";
const UI_VERSION = "stage-3-attention-signals";
const MAX_VISIBLE_FEED_ITEMS = 60;

type FeedUpdateEvent = CustomEvent<FeedItem[]>;

let extractionTimer: number | undefined;
let latestFeedItems: FeedItem[] = [];

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

function AtmosphereSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const feedItems = useFeedItems();
  const sampleItems = useMemo(() => feedItems.slice(0, 5), [feedItems]);
  const signalSummary = useMemo(() => calculateAttentionSignals(feedItems), [feedItems]);
  const status = feedItems.length > 0 ? "watching page" : "scanning page";
  const itemLabel = feedItems.length === 1 ? "item" : "items";
  const stats = useMemo(
    () => [
      { label: "Visible feed", value: `${feedItems.length} ${itemLabel}` },
      { label: "Extraction", value: status },
    ],
    [feedItems.length, itemLabel, status],
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
        aria-label={collapsed ? "Expand Shepherd Lens" : "Collapse Shepherd Lens"}
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
                    Shepherd Lens
                  </p>
                  <h1 className="mt-1 text-base font-semibold leading-6 text-stone-50">
                    Feed observation
                  </h1>
                </div>
                <div className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-medium text-stone-300">
                  Prototype
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
                  <span>local signals</span>
                  <span>heuristic</span>
                </div>
                <div className="space-y-2">
                  {signalSummary.signals.map((signal) => (
                    <div className="space-y-1.5" key={signal.id}>
                      <div className="flex items-center justify-between gap-3 text-[12px]">
                        <span className="text-stone-400">{signal.label}</span>
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

              <section>
                <div className="mb-2 flex items-center justify-between text-[11px] text-stone-500">
                  <span>sample titles</span>
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
                    No visible recommendations detected yet.
                  </p>
                )}
              </section>

              <div>
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>model</span>
                  <span>local only</span>
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
