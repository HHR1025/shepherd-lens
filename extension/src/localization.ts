import type {
  ExtractionFreshness,
  ExtractionHealth,
  HistoryDepth,
  ObservationBoundary,
  Recency,
  SampleQuality,
} from "./observation-quality";
import type { PageType } from "./history-tracking";
import type {
  EvidenceCategory,
  EvidenceProvider,
  EvidenceProviderStatus,
} from "./evidence-retrieval";

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
    availability: string;
    categories: Record<EvidenceCategory, string>;
    citationLanguage: string;
    citationVisible: string;
    identifier: string;
    independentMentions: string;
    localSignals: string;
    noCitationVisible: string;
    noRecommendations: string;
    noResultBoundary: string;
    noSourcesFound: string;
    noneVisible: string;
    notTruthScore: string;
    notVisible: string;
    partialFailure: string;
    partialResult: string;
    primaryMentions: string;
    providerStatus: string;
    providerStatuses: Record<EvidenceProviderStatus, string>;
    providers: Record<EvidenceProvider, string>;
    publicIndexes: string;
    query: string;
    ready: string;
    retry: string;
    searchComplete: string;
    searchFailed: string;
    searchSources: string;
    searching: string;
    selectedRecommendation: string;
    sourceCount: string;
    sourcesFound: string;
    visible: string;
    visibleOnly: string;
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
  researchExport: {
    heading: string;
    ready: string;
    unavailable: string;
    description: string;
    confirmation: string;
    coordinatorWarning: string;
    download: string;
    downloaded: string;
    failed: string;
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
      availability: "Evidence availability",
      categories: {
        research: "Research sources",
        reference: "Reference sources",
        reporting: "Recent reporting",
      },
      citationLanguage: "Citation language",
      citationVisible: "citation cues visible",
      identifier: "Visible link or DOI",
      independentMentions: "Named independent reporting",
      localSignals: "Visible evidence cues",
      noCitationVisible: "no citation cues visible",
      noRecommendations: "No visible recommendation is available for source discovery.",
      noResultBoundary: "No result does not mean no evidence exists. Results are discovery links, not proof of a video's claims.",
      noSourcesFound: "no sources discovered",
      noneVisible: "none visible",
      notTruthScore: "not a truth score",
      notVisible: "not visible",
      partialFailure: "One or more public indexes were unavailable.",
      partialResult: "partial result",
      primaryMentions: "Named primary institutions",
      providerStatus: "Public index status",
      providerStatuses: {
        success: "sources found",
        empty: "no results",
        error: "unavailable",
      },
      providers: {
        crossref: "Crossref",
        wikipedia: "Wikipedia",
        gdelt: "GDELT",
      },
      publicIndexes: "Keyless public-source search",
      query: "Search query",
      ready: "ready to search",
      retry: "Retry source search",
      searchComplete: "search complete",
      searchFailed: "source search failed",
      searchSources: "Find public sources",
      searching: "searching public indexes...",
      selectedRecommendation: "Selected recommendation",
      sourceCount: "{count} discovered links",
      sourcesFound: "{count} sources discovered",
      visible: "visible",
      visibleOnly: "Derived only from visible title, channel, and description",
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
    researchExport: {
      heading: "Research data export",
      ready: "local export available",
      unavailable: "no cases available",
      description: "Creates a local JSON bundle only. Titles and channels remain for annotation; links, descriptions, metadata, identifiers, and precise observation times are removed.",
      confirmation: "I understand what is retained and agree to create this local research export.",
      coordinatorWarning: "Keep the complete file with the study coordinator. Give annotators only the blinded section.",
      download: "Download JSON",
      downloaded: "downloaded locally",
      failed: "export failed",
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
      availability: "信源可获得性",
      categories: {
        research: "研究资料",
        reference: "参考资料",
        reporting: "近期报道",
      },
      citationLanguage: "引用表述",
      citationVisible: "可见引用线索",
      identifier: "可见链接或 DOI",
      independentMentions: "点名独立媒体",
      localSignals: "可见信源线索",
      noCitationVisible: "未见引用线索",
      noRecommendations: "当前没有可用于查找信源的推荐内容。",
      noResultBoundary: "没有检索结果不等于不存在证据；这些链接只用于辅助查证，不代表视频内容已经得到证实。",
      noSourcesFound: "暂未找到相关信源",
      noneVisible: "未见",
      notTruthScore: "不是真假评分",
      notVisible: "未见",
      partialFailure: "部分公共索引暂时不可用。",
      partialResult: "部分结果",
      primaryMentions: "点名一手机构",
      providerStatus: "公共索引状态",
      providerStatuses: {
        success: "已找到信源",
        empty: "暂无结果",
        error: "暂不可用",
      },
      providers: {
        crossref: "Crossref",
        wikipedia: "维基百科",
        gdelt: "GDELT",
      },
      publicIndexes: "免密钥公共信源检索",
      query: "检索词",
      ready: "可以开始查找",
      retry: "重新查找信源",
      searchComplete: "检索完成",
      searchFailed: "信源检索失败",
      searchSources: "查找公共信源",
      searching: "正在查询公共索引…",
      selectedRecommendation: "当前查证对象",
      sourceCount: "找到 {count} 条链接",
      sourcesFound: "找到 {count} 条信源",
      visible: "可见",
      visibleOnly: "仅根据页面可见的标题、频道和简介判断",
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
    researchExport: {
      heading: "研究数据导出",
      ready: "可在本机生成",
      unavailable: "暂无可导出样本",
      description: "仅在本机生成 JSON，不会自动上传。标题和频道名会保留用于人工标注；链接、简介、元数据、标识符和精确时间会移除。",
      confirmation: "我已了解导出内容，并同意在本机生成这份研究数据包。",
      coordinatorWarning: "完整文件仅供研究协调者保存；交给标注者时只使用 blinded 部分。",
      download: "下载 JSON",
      downloaded: "已下载到本机",
      failed: "导出失败",
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
