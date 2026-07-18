import type { AttentionSignal } from "./attention-signals";
import type { DriftComparison } from "./drift-comparison";
import {
  getCopy,
  type SidebarCopy,
  type SidebarLanguage,
} from "./localization";
import type { LocalMeasurementSummary } from "./local-measurements";
import type { UserExperimentState } from "./user-experiment";

export function formatLastSnapshot(
  timestamp: string | null,
  fallback: { notSavedYet: string; unknown: string },
) {
  if (!timestamp) {
    return fallback.notSavedYet;
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return fallback.unknown;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getAttentionClimate(
  signals: AttentionSignal[],
  copy: SidebarCopy,
) {
  const stimulation = signals.find((signal) => signal.id === "stimulation")?.value ?? 0;
  const conflict = signals.find((signal) => signal.id === "conflict")?.value ?? 0;
  const pressure = Math.round((stimulation + conflict) / 2);

  if (pressure >= 67) {
    return copy.overview.active;
  }

  if (pressure >= 34) {
    return copy.levels.moderate;
  }

  return copy.overview.quiet;
}

export function getFeedDiversity(
  summary: LocalMeasurementSummary,
  copy: SidebarCopy,
) {
  const entropy =
    summary.metrics.find((metric) => metric.id === "visible_feed_entropy")?.value ?? 0;
  const sourceDiversity =
    summary.metrics.find((metric) => metric.id === "source_diversity")?.value ?? 0;
  const diversity = Math.round((entropy + sourceDiversity) / 2);

  if (diversity >= 67) {
    return copy.levels.high;
  }

  if (diversity >= 34) {
    return copy.levels.moderate;
  }

  return copy.levels.low;
}

export function formatDriftSummary(
  comparison: DriftComparison,
  language: SidebarLanguage,
) {
  const copy = getCopy(language);

  if (!comparison.baselineAvailable) {
    return copy.drift.waiting;
  }

  const activeChanges = comparison.changes.filter(
    (change) => change.direction !== "steady",
  );

  if (activeChanges.length === 0) {
    return copy.drift.steady;
  }

  const parts = activeChanges.slice(0, 2).map((change) => {
    const signalName = copy.drift.signalNames[change.id] ?? change.label.toLowerCase();
    const direction = copy.drift.directions[change.direction];

    return language === "zh" ? `${signalName}${direction}` : `${signalName} ${direction}`;
  });

  return parts.join(language === "zh" ? "，" : ", ");
}

export function formatListOrEmpty(items: string[], emptyCopy: string) {
  return items.length > 0 ? items.join(", ") : emptyCopy;
}

export function uniqueValues(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

export function formatSnapshotCount(count: number, language: SidebarLanguage) {
  if (language === "zh") {
    return `${count} 次快照`;
  }

  return `${count} ${count === 1 ? "snapshot" : "snapshots"}`;
}

export function getTimelineCopy(language: SidebarLanguage) {
  if (language === "zh") {
    return {
      noveltyDecay: "新鲜度衰减",
      sessionSimilarity: "会话相似度",
      sessionWindow: "会话窗口",
      topicSwitching: "话题切换",
    };
  }

  return {
    noveltyDecay: "Novelty decay",
    sessionSimilarity: "Session similarity",
    sessionWindow: "Session window",
    topicSwitching: "Topic switching",
  };
}

export function getExperimentCopy(language: SidebarLanguage) {
  if (language === "zh") {
    return {
      active: "进行中",
      baseline: "起点样本",
      complete: "完成实验",
      description: "记录一个小动作，稍后对比推荐环境是否变化。仅保存在本地。",
      heading: "实验模式",
      latest: "最近实验",
      notePlaceholder: "简短记录这次动作...",
      ready: "准备记录",
      saved: "已记录",
      kinds: {
        ignore: "忽略",
        note: "记录",
        recovery: "恢复",
        search: "搜索",
        watch: "观看",
      },
    };
  }

  return {
    active: "Active",
    baseline: "Baseline",
    complete: "Complete experiment",
    description: "Mark a small action, then compare whether the recommendation environment shifts.",
    heading: "Experiment mode",
    latest: "Latest experiment",
    notePlaceholder: "Short note about this action...",
    ready: "ready to mark",
    saved: "saved locally",
    kinds: {
      ignore: "Ignore",
      note: "Note",
      recovery: "Recovery",
      search: "Search",
      watch: "Watch",
    },
  };
}

export function getExperimentStatusValue(
  state: UserExperimentState,
  language: SidebarLanguage,
) {
  const copy = getExperimentCopy(language);

  if (state.activeExperiment) {
    return copy.kinds[state.activeExperiment.kind];
  }

  return state.experiments.length > 0
    ? `${state.experiments.length} ${copy.saved}`
    : copy.ready;
}

export function getExperimentStatusDetail(
  state: UserExperimentState,
  language: SidebarLanguage,
) {
  const copy = getExperimentCopy(language);

  if (state.activeExperiment) {
    return copy.active;
  }

  return state.experiments.length > 0 ? copy.latest : copy.ready;
}

export function formatExperimentDeltas(
  deltas: UserExperimentState["experiments"][number]["deltas"],
  language: SidebarLanguage,
) {
  const copy = getCopy(language);

  return deltas
    .filter((delta) => delta.delta !== 0)
    .slice(0, 3)
    .map((delta) => {
      const label = copy.signalLabels[delta.id] ?? delta.label;
      const sign = delta.delta > 0 ? "+" : "";

      return {
        label,
        value: `${sign}${delta.delta}`,
      };
    });
}
