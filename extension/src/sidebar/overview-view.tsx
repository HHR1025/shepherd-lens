import { useMemo } from "react";
import { calculateAttentionSignals } from "../attention-signals";
import { compareFeedDrift, type DriftComparison } from "../drift-comparison";
import type { FeedItem } from "../feed-item";
import { getHistoryStatus, type HistoryState } from "../history-tracking";
import {
  formatItemCount,
  getCopy,
  type SidebarLanguage,
} from "../localization";
import {
  calculateLocalMeasurements,
  type LocalMeasurementSummary,
} from "../local-measurements";
import { analyzeSessionTimeline, type SessionTimelineSummary } from "../session-timeline";
import {
  formatDriftSummary,
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
} from "../sidebar-presenter";
import type {
  ExperimentKind,
  UserExperimentState,
} from "../user-experiment";
import { ExperimentPanel } from "./experiment-panel";
import {
  KeyValueList,
  MetricBar,
  SampleList,
  SummaryDisclosure,
} from "./primitives";

export function OverviewView({
  experimentState,
  feedItems,
  history,
  language,
  onCompleteExperiment,
  onStartExperiment,
}: {
  experimentState: UserExperimentState;
  feedItems: FeedItem[];
  history: HistoryState;
  language: SidebarLanguage;
  onCompleteExperiment: () => Promise<void>;
  onStartExperiment: (kind: ExperimentKind, note: string) => Promise<void>;
}) {
  const copy = getCopy(language);
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
          onComplete={onCompleteExperiment}
          onStart={onStartExperiment}
          state={experimentState}
        />
      </SummaryDisclosure>
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
