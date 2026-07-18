import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { normalizeKey, type FeedItem } from "../feed-item";

export function SummaryDisclosure({
  children,
  defaultOpen = false,
  detail,
  label,
  priority = "normal",
  value,
}: {
  children: ReactNode;
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

export function MetricBar({
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

export function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
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

export function SampleList({
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
