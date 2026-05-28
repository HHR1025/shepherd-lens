import React, { useMemo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./sidebar.css?inline";

const HOST_ID = "shepherd-lens-sidebar-root";

let root: Root | null = null;

console.info("[Shepherd Lens] content script loaded", window.location.href);

function AtmosphereSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const signals = useMemo(
    () => [
      { label: "Current Feed Atmosphere", value: "emotionally accelerated" },
      { label: "Algorithmic Pressure", value: "moderate" },
      { label: "Attention Climate", value: "unstable" },
    ],
    [],
  );

  return (
    <motion.aside
      className="fixed right-5 top-1/2 z-[2147483647] flex translate-y-[-50%] items-stretch gap-3 font-sans text-slate-50"
      initial={{ opacity: 0, x: 42, filter: "blur(12px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        className="group my-auto grid h-12 w-10 place-items-center rounded-l-2xl border border-cyan-200/20 bg-slate-950/70 text-cyan-100 shadow-[0_0_34px_rgba(34,211,238,0.24)] backdrop-blur-xl transition hover:border-cyan-200/45 hover:bg-slate-900/85"
        type="button"
        aria-label={collapsed ? "Expand Shepherd Lens" : "Collapse Shepherd Lens"}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <motion.span
          className="block text-lg leading-none"
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.26 }}
        >
          {collapsed ? "{" : "}"}
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="relative w-[342px] overflow-hidden rounded-[22px] border border-cyan-100/20 bg-[#061018]/75 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.58),0_0_48px_rgba(20,184,166,0.18)] backdrop-blur-2xl"
            initial={{ opacity: 0, width: 0, x: 30 }}
            animate={{ opacity: 1, width: 342, x: 0 }}
            exit={{ opacity: 0, width: 0, x: 30 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(125,92,255,0.22),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.09),transparent_32%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
            <div className="pointer-events-none absolute -right-16 top-8 h-36 w-36 rounded-full border border-cyan-200/15" />

            <div className="relative space-y-5">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-cyan-200/70">
                    Shepherd Lens
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold leading-7 text-slate-50">
                    Attention Atmosphere
                  </h1>
                </div>
                <div className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                  live
                </div>
              </header>

              <div className="h-px bg-gradient-to-r from-cyan-200/0 via-cyan-200/28 to-violet-200/0" />

              <section className="space-y-3">
                {signals.map((signal, index) => (
                  <motion.div
                    className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    key={signal.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 + index * 0.07, duration: 0.34 }}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-300/60">
                      {signal.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold leading-6 text-cyan-50">
                      {signal.value}
                    </p>
                  </motion.div>
                ))}
              </section>

              <div className="rounded-2xl border border-cyan-200/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-300/60">
                  <span>render pipeline</span>
                  <span>MV3</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-200 to-violet-300"
                    initial={{ width: "18%" }}
                    animate={{ width: "68%" }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
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
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = styles;

  const mount = document.createElement("div");
  mount.id = "shepherd-lens-react-root";
  mount.innerHTML = `
    <aside style="
      position: fixed;
      right: 20px;
      top: 50%;
      z-index: 2147483647;
      width: 342px;
      transform: translateY(-50%);
      border: 1px solid rgba(165, 243, 252, 0.22);
      border-radius: 22px;
      background: rgba(6, 16, 24, 0.88);
      box-shadow: 0 24px 90px rgba(0, 0, 0, 0.58), 0 0 48px rgba(20, 184, 166, 0.22);
      color: #ecfeff;
      font: 14px Inter, ui-sans-serif, system-ui, sans-serif;
      padding: 20px;
    ">
      <div style="font-size: 10px; font-weight: 700; letter-spacing: .32em; text-transform: uppercase; color: rgba(165, 243, 252, .72);">
        Shepherd Lens
      </div>
      <div style="margin-top: 10px; font-size: 22px; font-weight: 700;">Attention Atmosphere</div>
      <div style="margin-top: 18px; opacity: .74;">loading atmospheric interface...</div>
    </aside>
  `;

  shadow.append(style, mount);
  document.documentElement.appendChild(host);

  root = createRoot(mount);
  root.render(<AtmosphereSidebar />);

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
}

scheduleInjection();

window.addEventListener("yt-navigate-finish", scheduleInjection);
window.addEventListener("popstate", scheduleInjection);

const observer = new MutationObserver(() => {
  if (!document.getElementById(HOST_ID)) {
    scheduleInjection();
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
