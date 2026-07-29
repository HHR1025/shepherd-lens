import type {
  ExtractionFreshness,
  ExtractionHealth,
  HistoryDepth,
  ObservationBoundary,
  Recency,
  SampleQuality,
} from "./observation-quality";
import type { PageType } from "./history-tracking";

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
  views: {
    overview: string;
    evidence: string;
  };
  overview: {
    attentionClimate: string;
    feedDiversity: string;
    driftSummary: string;
    localStatus: string;
    observed: string;
    stable: string;
    active: string;
    quiet: string;
    partial: string;
  };
  sections: {
    attention: string;
    feedStructure: string;
    drift: string;
    history: string;
    samples: string;
  };
  evidence: {
    confidence: string;
    sources: string;
    primarySources: string;
    independentReporting: string;
    sourceDiversity: string;
    sourceNavigation: string;
    waiting: string;
    placeholder: string;
    notTruthScore: string;
    comingSoon: string;
  };
  observation: {
    heading: string;
    boundary: string;
    visibleSample: string;
    pageContext: string;
    historyDepth: string;
    historyRecency: string;
    extractionFreshness: string;
    extractionHealth: string;
    notPlatformWide: string;
    boundaries: Record<ObservationBoundary, string>;
    sampleQualities: Record<SampleQuality, string>;
    pageTypes: Record<PageType, string>;
    historyDepths: Record<HistoryDepth, string>;
    recencies: Record<Recency, string>;
    freshness: Record<ExtractionFreshness, string>;
    health: Record<ExtractionHealth, string>;
  };
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
    views: {
      overview: "Overview",
      evidence: "Evidence",
    },
    overview: {
      attentionClimate: "Attention climate",
      feedDiversity: "Feed diversity",
      driftSummary: "Drift summary",
      localStatus: "Local status",
      observed: "observed",
      stable: "stable",
      active: "active",
      quiet: "quiet",
      partial: "partial",
    },
    sections: {
      attention: "Attention environment",
      feedStructure: "Feed structure",
      drift: "Drift analysis",
      history: "History status",
      samples: "Recommendation samples",
    },
    evidence: {
      confidence: "Evidence confidence",
      sources: "Sources",
      primarySources: "Primary sources",
      independentReporting: "Independent reporting",
      sourceDiversity: "Source diversity",
      sourceNavigation: "Source navigation",
      waiting: "not active yet",
      placeholder: "Evidence navigation is reserved for a later stage.",
      notTruthScore: "not a truth score",
      comingSoon: "coming soon",
    },
    observation: {
      heading: "Observation quality",
      boundary: "Interpretation boundary",
      visibleSample: "Visible sample",
      pageContext: "Page context",
      historyDepth: "History depth",
      historyRecency: "History recency",
      extractionFreshness: "Extraction freshness",
      extractionHealth: "Extraction health",
      notPlatformWide: "Limited to the current visible surface",
      boundaries: {
        weak_signal: "weak signal",
        page_snapshot: "page snapshot",
        session_trend: "session trend",
      },
      sampleQualities: {
        insufficient: "insufficient sample",
        narrow: "narrow sample",
        adequate: "adequate sample",
      },
      pageTypes: {
        home: "home",
        watch: "watch page",
        search: "search results",
        shorts: "Shorts",
        other: "other page",
      },
      historyDepths: {
        none: "no history",
        shallow: "shallow history",
        established: "established history",
      },
      recencies: {
        none: "no history",
        recent: "recent",
        stale: "stale",
      },
      freshness: {
        waiting: "waiting for extraction",
        fresh: "fresh",
        stale: "stale",
      },
      health: {
        waiting: "waiting for extraction",
        observed: "visible items observed",
        empty: "no visible items found",
      },
    },
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
    views: {
      overview: "概览",
      evidence: "信源",
    },
    overview: {
      attentionClimate: "注意力气候",
      feedDiversity: "推荐多样性",
      driftSummary: "变化摘要",
      localStatus: "本地状态",
      observed: "已观察",
      stable: "稳定",
      active: "活跃",
      quiet: "平缓",
      partial: "局部样本",
    },
    sections: {
      attention: "注意力环境",
      feedStructure: "推荐结构",
      drift: "变化分析",
      history: "历史状态",
      samples: "推荐样本",
    },
    evidence: {
      confidence: "证据可信度",
      sources: "信源",
      primarySources: "一手来源",
      independentReporting: "独立报道",
      sourceDiversity: "来源多样性",
      sourceNavigation: "信源导航",
      waiting: "尚未启用",
      placeholder: "信源导航已预留，将在后续阶段接入。",
      notTruthScore: "不是真假评分",
      comingSoon: "待接入",
    },
    observation: {
      heading: "观察质量",
      boundary: "结论边界",
      visibleSample: "可见样本",
      pageContext: "页面场景",
      historyDepth: "历史基础",
      historyRecency: "历史时效",
      extractionFreshness: "提取时效",
      extractionHealth: "提取状态",
      notPlatformWide: "仅代表当前可见范围",
      boundaries: {
        weak_signal: "弱信号",
        page_snapshot: "页面快照",
        session_trend: "会话趋势",
      },
      sampleQualities: {
        insufficient: "样本不足",
        narrow: "样本偏窄",
        adequate: "样本较充分",
      },
      pageTypes: {
        home: "首页",
        watch: "播放页",
        search: "搜索结果页",
        shorts: "Shorts",
        other: "其他页面",
      },
      historyDepths: {
        none: "暂无历史",
        shallow: "历史较浅",
        established: "历史较充足",
      },
      recencies: {
        none: "暂无记录",
        recent: "近期",
        stale: "已过时",
      },
      freshness: {
        waiting: "等待提取",
        fresh: "刚刚更新",
        stale: "需要刷新",
      },
      health: {
        waiting: "等待提取",
        observed: "已识别可见项目",
        empty: "未发现可见项目",
      },
    },
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
