import { useState } from "react";
import type { FeedItem } from "../feed-item";
import type { HistoryState } from "../history-tracking";
import type { SidebarCopy } from "../localization";
import {
  createPilotExportBundle,
  pilotExportFilename,
  serializePilotExportBundle,
} from "../pilot-study-export";

type ExportStatus = "idle" | "downloaded" | "failed";

export function PilotExportPanel({
  copy,
  feedItems,
  history,
  observedAt,
  url,
}: {
  copy: SidebarCopy["researchExport"];
  feedItems: FeedItem[];
  history: HistoryState;
  observedAt: string | null;
  url: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const available =
    feedItems.length > 0 ||
    history.snapshots.some((snapshot) => snapshot.feedItems.length > 0);

  const download = () => {
    try {
      const bundle = createPilotExportBundle({
        consentConfirmed: confirmed,
        currentFeedItems: feedItems,
        currentObservedAt: observedAt,
        currentUrl: url,
        history,
      });
      const blob = new Blob([serializePilotExportBundle(bundle)], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.download = pilotExportFilename(bundle);
      anchor.href = objectUrl;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setConfirmed(false);
      setStatus("downloaded");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <section className="border-t border-white/8 pt-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-medium text-stone-400">
          {copy.heading}
        </h3>
        <span className="text-[10px] text-stone-600">
          {available ? copy.ready : copy.unavailable}
        </span>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-stone-500">
        {copy.description}
      </p>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-[10px] leading-4 text-stone-400">
        <input
          checked={confirmed}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-stone-200"
          disabled={!available}
          type="checkbox"
          onChange={(event) => {
            setConfirmed(event.target.checked);
            setStatus("idle");
          }}
        />
        <span>{copy.confirmation}</span>
      </label>
      <p className="mt-2 text-[10px] leading-4 text-stone-600">
        {copy.coordinatorWarning}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[10px] text-stone-600" aria-live="polite">
          {status === "downloaded"
            ? copy.downloaded
            : status === "failed"
              ? copy.failed
              : ""}
        </span>
        <button
          className="rounded-md border border-white/10 bg-white/6 px-2.5 py-1.5 text-[11px] font-medium text-stone-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!available || !confirmed}
          type="button"
          onClick={download}
        >
          {copy.download}
        </button>
      </div>
    </section>
  );
}
