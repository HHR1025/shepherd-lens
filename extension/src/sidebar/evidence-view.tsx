import { useMemo, useState } from "react";
import type { EvidenceRetriever } from "../browser-evidence-retriever";
import {
  deriveEvidenceQuery,
  detectVisibleEvidenceSignals,
} from "../evidence-analysis";
import type {
  EvidenceCategory,
  EvidenceSearchResult,
} from "../evidence-retrieval";
import { normalizeKey, type FeedItem } from "../feed-item";
import { getCopy, type SidebarLanguage } from "../localization";
import { KeyValueList, SummaryDisclosure } from "./primitives";

const VISIBLE_SELECTION_LIMIT = 8;
const CATEGORY_ORDER: EvidenceCategory[] = [
  "research",
  "reference",
  "reporting",
];

export function EvidenceView({
  feedItems,
  language,
  retriever,
}: {
  feedItems: FeedItem[];
  language: SidebarLanguage;
  retriever: EvidenceRetriever | null;
}) {
  const copy = getCopy(language);
  const visibleItems = feedItems.slice(0, VISIBLE_SELECTION_LIMIT);
  const [selectedKey, setSelectedKey] = useState(
    () => visibleItems[0] ? normalizeKey(visibleItems[0]) : "",
  );
  const [requestState, setRequestState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [requestQuery, setRequestQuery] = useState("");
  const [result, setResult] = useState<EvidenceSearchResult | null>(null);
  const selectedItem =
    visibleItems.find((item) => normalizeKey(item) === selectedKey) ??
    visibleItems[0] ??
    null;
  const query = selectedItem ? deriveEvidenceQuery(selectedItem) : "";
  const signals = useMemo(
    () => selectedItem ? detectVisibleEvidenceSignals(selectedItem) : null,
    [selectedItem],
  );

  if (!selectedItem || !signals) {
    return (
      <section className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-4">
        <p className="text-[12px] leading-5 text-stone-500">
          {copy.evidence.noRecommendations}
        </p>
      </section>
    );
  }

  const activeResult = result?.query === query ? result : null;
  const activeRequestState = requestQuery === query ? requestState : "idle";
  const sourceCount = activeResult?.sources.length ?? 0;
  const providerErrorCount = activeResult
    ? Object.values(activeResult.providers).filter((status) => status === "error").length
    : 0;
  const availability = activeRequestState === "loading"
    ? copy.evidence.searching
    : activeRequestState === "error"
      ? copy.evidence.searchFailed
      : activeResult
        ? sourceCount > 0
          ? copy.evidence.sourcesFound.replace("{count}", String(sourceCount))
          : copy.evidence.noSourcesFound
        : copy.evidence.ready;

  const search = async () => {
    if (!retriever || !query) {
      setRequestState("error");
      return;
    }

    setRequestQuery(query);
    setRequestState("loading");

    try {
      const nextResult = await retriever.search(query, language);
      setResult(nextResult);
      setRequestState("idle");
    } catch {
      setResult(null);
      setRequestState("error");
    }
  };

  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-white/8 bg-white/[0.035] px-3 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-stone-500">
              {copy.evidence.availability}
            </p>
            <p className="mt-1 break-words text-[13px] font-semibold leading-[18px] text-stone-100">
              {availability}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-stone-400">
            {copy.evidence.notTruthScore}
          </span>
        </div>

        <label className="mt-4 block text-[11px] text-stone-500">
          {copy.evidence.selectedRecommendation}
          <select
            className="mt-1.5 w-full rounded-md border border-white/10 bg-[#191919] px-2.5 py-2 text-[11px] leading-4 text-stone-200 outline-none transition focus:border-white/25"
            value={normalizeKey(selectedItem)}
            onChange={(event) => {
              setSelectedKey(event.target.value);
              setRequestState("idle");
              setRequestQuery("");
              setResult(null);
            }}
          >
            {visibleItems.map((item) => (
              <option key={normalizeKey(item)} value={normalizeKey(item)}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 rounded-md bg-black/20 px-2.5 py-2">
          <p className="text-[10px] text-stone-600">{copy.evidence.query}</p>
          <p className="mt-1 break-words text-[11px] leading-4 text-stone-300">
            {query}
          </p>
        </div>

        <button
          className="mt-3 w-full rounded-md border border-white/10 bg-white/8 px-3 py-2 text-[11px] font-medium text-stone-100 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          disabled={activeRequestState === "loading" || !retriever || !query}
          onClick={() => void search()}
        >
          {activeRequestState === "loading"
            ? copy.evidence.searching
            : activeResult || activeRequestState === "error"
              ? copy.evidence.retry
              : copy.evidence.searchSources}
        </button>
      </div>

      <SummaryDisclosure
        detail={copy.evidence.visibleOnly}
        label={copy.evidence.localSignals}
        value={signals.citationLanguageVisible
          ? copy.evidence.citationVisible
          : copy.evidence.noCitationVisible}
      >
        <KeyValueList
          items={[
            {
              label: copy.evidence.citationLanguage,
              value: booleanCopy(signals.citationLanguageVisible, copy),
            },
            {
              label: copy.evidence.identifier,
              value: booleanCopy(signals.identifierVisible, copy),
            },
            {
              label: copy.evidence.primaryMentions,
              value: signals.primarySourceMentions.join(", ") || copy.evidence.noneVisible,
            },
            {
              label: copy.evidence.independentMentions,
              value:
                signals.independentReportingMentions.join(", ") ||
                copy.evidence.noneVisible,
            },
          ]}
        />
      </SummaryDisclosure>

      {activeResult ? (
        <>
          <SummaryDisclosure
            defaultOpen
            detail={providerErrorCount > 0 ? copy.evidence.partialFailure : copy.evidence.publicIndexes}
            label={copy.evidence.providerStatus}
            value={providerErrorCount > 0 ? copy.evidence.partialResult : copy.evidence.searchComplete}
          >
            <KeyValueList
              items={Object.entries(activeResult.providers).map(([provider, status]) => ({
                label: copy.evidence.providers[provider as keyof typeof copy.evidence.providers],
                value: copy.evidence.providerStatuses[status],
              }))}
            />
          </SummaryDisclosure>

          {CATEGORY_ORDER.map((category) => {
            const sources = activeResult.sources.filter(
              (source) => source.category === category,
            );

            if (sources.length === 0) {
              return null;
            }

            return (
              <SummaryDisclosure
                detail={copy.evidence.sourceCount.replace("{count}", String(sources.length))}
                key={category}
                label={copy.evidence.categories[category]}
                value={sources[0].sourceName}
              >
                <ul className="space-y-2">
                  {sources.map((source) => (
                    <li key={source.url}>
                      <a
                        className="block rounded-md bg-white/[0.035] px-2.5 py-2 transition hover:bg-white/[0.07]"
                        href={source.url}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        <span className="line-clamp-2 text-[11px] leading-4 text-stone-200">
                          {source.title}
                        </span>
                        <span className="mt-1 block truncate text-[9px] text-stone-600">
                          {source.sourceName}
                          {source.publishedAt ? ` · ${source.publishedAt.slice(0, 10)}` : ""}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </SummaryDisclosure>
            );
          })}
        </>
      ) : null}

      <p className="border-t border-white/8 pt-3 text-[10px] leading-4 text-stone-600">
        {copy.evidence.noResultBoundary}
      </p>
    </section>
  );
}

function booleanCopy(
  visible: boolean,
  copy: ReturnType<typeof getCopy>,
) {
  return visible ? copy.evidence.visible : copy.evidence.notVisible;
}
