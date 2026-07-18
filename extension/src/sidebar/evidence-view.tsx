import { getCopy, type SidebarLanguage } from "../localization";
import { KeyValueList } from "./primitives";

export function EvidenceView({ language }: { language: SidebarLanguage }) {
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
