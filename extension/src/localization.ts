export type SidebarLanguage = "en" | "zh";

export type DriftDirection = "rising" | "falling" | "steady";

export type SidebarCopy = {
  brand: string;
  prototype: string;
  heading: string;
  visibleFeed: string;
  extraction: string;
  watchingPage: string;
  scanningPage: string;
  snapshots: string;
  lastSaved: string;
  notSavedYet: string;
  unknown: string;
  localSignals: string;
  heuristic: string;
  signalLabels: Record<string, string>;
  localMeasures: string;
  measureLabels: Record<string, string>;
  levels: Record<"low" | "moderate" | "high", string>;
  sampleTitles: string;
  emptyRecommendations: string;
  model: string;
  localOnly: string;
  item: string;
  items: string;
  collapse: string;
  expand: string;
  languageToggle: string;
  drift: {
    heading: string;
    waiting: string;
    steady: string;
    comparedWith: string;
    previousSnapshot: string;
    repeatedChannels: string;
    topicLoops: string;
    noneDetected: string;
    directions: Record<DriftDirection, string>;
    signalNames: Record<string, string>;
  };
};

export const LANGUAGE_STORAGE_KEY = "shepherdLensLanguage";

export const sidebarCopy: Record<SidebarLanguage, SidebarCopy> = {
  en: {
    brand: "Shepherd Lens",
    prototype: "Prototype",
    heading: "Feed observation",
    visibleFeed: "Visible feed",
    extraction: "Extraction",
    watchingPage: "watching page",
    scanningPage: "scanning page",
    snapshots: "Snapshots",
    lastSaved: "Last saved",
    notSavedYet: "not saved yet",
    unknown: "unknown",
    localSignals: "local signals",
    heuristic: "heuristic",
    signalLabels: {
      stimulation: "Stimulation",
      conflict: "Conflict",
      novelty: "Novelty",
      repetition: "Repetition",
      short_form: "Short-form",
    },
    localMeasures: "local measures",
    measureLabels: {
      channel_concentration: "Channel focus",
      topic_concentration: "Topic focus",
      visible_feed_entropy: "Feed entropy",
      source_diversity: "Source diversity",
      title_hook_density: "Hook density",
    },
    levels: {
      low: "low",
      moderate: "moderate",
      high: "high",
    },
    sampleTitles: "sample titles",
    emptyRecommendations: "No visible recommendations detected yet.",
    model: "model",
    localOnly: "local only",
    item: "item",
    items: "items",
    collapse: "Collapse Shepherd Lens",
    expand: "Expand Shepherd Lens",
    languageToggle: "Switch sidebar language",
    drift: {
      heading: "Visible feed drift",
      waiting: "waiting for history",
      steady: "signals steady",
      comparedWith: "Compared with",
      previousSnapshot: "previous snapshot",
      repeatedChannels: "Repeated channels",
      topicLoops: "Topic loops",
      noneDetected: "none detected",
      directions: {
        rising: "rising",
        falling: "falling",
        steady: "steady",
      },
      signalNames: {
        stimulation: "stimulation",
        conflict: "conflict",
        novelty: "novelty",
        repetition: "repetition",
        short_form: "short-form",
      },
    },
  },
  zh: {
    brand: "Shepherd Lens",
    prototype: "原型",
    heading: "推荐观察",
    visibleFeed: "当前推荐",
    extraction: "监听状态",
    watchingPage: "监听页面",
    scanningPage: "扫描页面",
    snapshots: "历史快照",
    lastSaved: "最近记录",
    notSavedYet: "尚未记录",
    unknown: "未知",
    localSignals: "注意力信号",
    heuristic: "本地规则",
    signalLabels: {
      stimulation: "刺激强度",
      conflict: "冲突密度",
      novelty: "新鲜度",
      repetition: "重复感",
      short_form: "短内容",
    },
    localMeasures: "本地测量",
    measureLabels: {
      channel_concentration: "频道集中度",
      topic_concentration: "主题集中度",
      visible_feed_entropy: "推荐熵",
      source_diversity: "来源多样性",
      title_hook_density: "标题钩子",
    },
    levels: {
      low: "低",
      moderate: "中",
      high: "高",
    },
    sampleTitles: "推荐样本",
    emptyRecommendations: "暂未识别到可见推荐。",
    model: "模型",
    localOnly: "仅本地",
    item: "条",
    items: "条",
    collapse: "收起 Shepherd Lens",
    expand: "展开 Shepherd Lens",
    languageToggle: "切换侧栏语言",
    drift: {
      heading: "推荐变化",
      waiting: "等待历史样本",
      steady: "整体稳定",
      comparedWith: "对比基准",
      previousSnapshot: "上次快照",
      repeatedChannels: "重复频道",
      topicLoops: "主题回环",
      noneDetected: "暂未发现",
      directions: {
        rising: "上升",
        falling: "下降",
        steady: "基本稳定",
      },
      signalNames: {
        stimulation: "刺激",
        conflict: "冲突",
        novelty: "新鲜度",
        repetition: "重复",
        short_form: "短内容",
      },
    },
  },
};

export function normalizeLanguage(value: unknown): SidebarLanguage {
  return value === "zh" ? "zh" : "en";
}

export function nextLanguage(language: SidebarLanguage): SidebarLanguage {
  return language === "en" ? "zh" : "en";
}

export function getCopy(language: SidebarLanguage) {
  return sidebarCopy[language];
}

export function formatItemCount(count: number, language: SidebarLanguage) {
  const copy = getCopy(language);

  if (language === "zh") {
    return `${count} ${copy.items}`;
  }

  return `${count} ${count === 1 ? copy.item : copy.items}`;
}
