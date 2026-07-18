import { useState } from "react";
import { formatItemCount, type SidebarLanguage } from "../localization";
import {
  formatExperimentDeltas,
  getExperimentCopy,
} from "../sidebar-presenter";
import type {
  ExperimentKind,
  UserExperimentState,
} from "../user-experiment";
import { KeyValueList } from "./primitives";

export function ExperimentPanel({
  language,
  onComplete,
  onStart,
  state,
}: {
  language: SidebarLanguage;
  onComplete: () => Promise<void>;
  onStart: (kind: ExperimentKind, note: string) => Promise<void>;
  state: UserExperimentState;
}) {
  const copy = getExperimentCopy(language);
  const [note, setNote] = useState("");
  const activeExperiment = state.activeExperiment;
  const latestExperiment = state.experiments.at(-1);

  const startExperiment = async (kind: ExperimentKind) => {
    await onStart(kind, note);
    setNote("");
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
            onClick={() => void onComplete()}
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
