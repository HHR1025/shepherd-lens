export type SidebarLanguage = "en" | "zh";

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
  sampleTitles: string;
  emptyRecommendations: string;
  model: string;
  localOnly: string;
  item: string;
  items: string;
  collapse: string;
  expand: string;
  languageToggle: string;
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
    sampleTitles: "sample titles",
    emptyRecommendations: "No visible recommendations detected yet.",
    model: "model",
    localOnly: "local only",
    item: "item",
    items: "items",
    collapse: "Collapse Shepherd Lens",
    expand: "Expand Shepherd Lens",
    languageToggle: "Switch sidebar language",
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
    sampleTitles: "推荐样本",
    emptyRecommendations: "暂未识别到可见推荐。",
    model: "模型",
    localOnly: "仅本地",
    item: "条",
    items: "条",
    collapse: "收起 Shepherd Lens",
    expand: "展开 Shepherd Lens",
    languageToggle: "切换侧栏语言",
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
