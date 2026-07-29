import { describe, expect, it } from "vitest";
import {
  formatItemCount,
  getCopy,
  nextLanguage,
  normalizeLanguage,
} from "./localization";

describe("localization", () => {
  it("defaults unknown language values to English", () => {
    expect(normalizeLanguage("zh")).toBe("zh");
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("fr")).toBe("en");
    expect(normalizeLanguage(null)).toBe("en");
  });

  it("toggles between English and Chinese", () => {
    expect(nextLanguage("en")).toBe("zh");
    expect(nextLanguage("zh")).toBe("en");
  });

  it("formats English item counts with singular and plural copy", () => {
    expect(formatItemCount(1, "en")).toBe("1 item");
    expect(formatItemCount(2, "en")).toBe("2 items");
  });

  it("formats Chinese item counts with natural compact copy", () => {
    expect(formatItemCount(1, "zh")).toBe("1 条");
    expect(formatItemCount(12, "zh")).toBe("12 条");
  });

  it("uses context-aware Chinese sidebar labels", () => {
    const copy = getCopy("zh");

    expect(copy.visibleFeed).toBe("当前推荐");
    expect(copy.localSignals).toBe("注意力信号");
    expect(copy.signalLabels.stimulation).toBe("刺激强度");
    expect(copy.signalLabels.short_form).toBe("短内容");
    expect(copy.localMeasures).toBe("本地测量");
    expect(copy.measureLabels.channel_concentration).toBe("频道集中度");
    expect(copy.measureLabels.visible_feed_entropy).toBe("推荐熵");
    expect(copy.views.overview).toBe("概览");
    expect(copy.views.evidence).toBe("信源");
    expect(copy.evidence.notTruthScore).toBe("不是真假评分");
    expect(copy.observation.heading).toBe("观察质量");
    expect(copy.observation.boundaries.weak_signal).toBe("弱信号");
    expect(copy.observation.boundaries.page_snapshot).toBe("页面快照");
    expect(copy.observation.boundaries.session_trend).toBe("会话趋势");
    expect(copy.observation.notPlatformWide).toBe("仅代表当前可见范围");
  });
});
