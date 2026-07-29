import { useEffect, useMemo, useState } from "react";
import type { FeedItem } from "../feed-item";
import type { HistoryState } from "../history-tracking";
import {
  formatItemCount,
  getCopy,
  type SidebarLanguage,
} from "../localization";
import { assessObservationQuality } from "../observation-quality";
import { KeyValueList, SummaryDisclosure } from "./primitives";

export function ObservationQualityDisclosure({
  feedItems,
  history,
  language,
  observedAt,
  url,
}: {
  feedItems: FeedItem[];
  history: HistoryState;
  language: SidebarLanguage;
  observedAt: string | null;
  url: string;
}) {
  const copy = getCopy(language);
  const now = useMinuteClock();
  const quality = useMemo(
    () =>
      assessObservationQuality({
        feedItems,
        history,
        observedAt,
        url,
        now,
      }),
    [feedItems, history, now, observedAt, url],
  );

  return (
    <SummaryDisclosure
      detail={`${formatItemCount(feedItems.length, language)} · ${
        copy.observation.pageTypes[quality.pageType]
      }`}
      label={copy.observation.heading}
      priority="low"
      value={copy.observation.boundaries[quality.boundary]}
    >
      <div className="space-y-3">
        <KeyValueList
          items={[
            {
              label: copy.observation.boundary,
              value: copy.observation.boundaries[quality.boundary],
            },
            {
              label: copy.observation.visibleSample,
              value: `${formatItemCount(feedItems.length, language)} · ${
                copy.observation.sampleQualities[quality.sampleQuality]
              }`,
            },
            {
              label: copy.observation.pageContext,
              value: copy.observation.pageTypes[quality.pageType],
            },
            {
              label: copy.observation.historyDepth,
              value: copy.observation.historyDepths[quality.historyDepth],
            },
            {
              label: copy.observation.historyRecency,
              value: copy.observation.recencies[quality.historyRecency],
            },
            {
              label: copy.observation.extractionFreshness,
              value: copy.observation.freshness[quality.extractionFreshness],
            },
            {
              label: copy.observation.extractionHealth,
              value: copy.observation.health[quality.extractionHealth],
            },
            {
              label: copy.snapshots,
              value: `${quality.snapshotCount}`,
            },
          ]}
        />
        <p className="border-t border-white/8 pt-3 text-[10px] leading-4 text-stone-600">
          {copy.observation.notPlatformWide}
        </p>
      </div>
    </SummaryDisclosure>
  );
}

function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return now;
}
