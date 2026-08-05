import { describe, expect, it } from "vitest";
import type { FeedItem } from "./feed-item";
import {
  deriveEvidenceQuery,
  detectVisibleEvidenceSignals,
} from "./evidence-analysis";

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    title: "According to WHO data: Air quality improved 12:45",
    channel: "Example channel",
    description: "Read the report at https://www.who.int/example",
    duration: "12:45",
    url: "https://www.youtube.com/watch?v=evidence",
    ...overrides,
  };
}

describe("evidence analysis", () => {
  it("derives a transparent bounded query from visible metadata", () => {
    expect(deriveEvidenceQuery(item())).toBe(
      "According to WHO data Air quality improved",
    );

    expect(
      deriveEvidenceQuery(
        item({ title: `A ${"very ".repeat(80)}long title 9:59` }),
      ).length,
    ).toBeLessThanOrEqual(180);
  });

  it("keeps natural Chinese text while removing visible duration noise", () => {
    expect(
      deriveEvidenceQuery(
        item({
          title: "根据世界卫生组织报告，空气质量正在改善 8分钟20秒",
          duration: "8:20",
        }),
      ),
    ).toBe("根据世界卫生组织报告 空气质量正在改善");
  });

  it("detects only evidence signals visible in the selected item", () => {
    expect(detectVisibleEvidenceSignals(item())).toEqual({
      citationLanguageVisible: true,
      identifierVisible: true,
      independentReportingMentions: [],
      primarySourceMentions: ["WHO"],
    });

    expect(
      detectVisibleEvidenceSignals(
        item({
          title: "路透社援引世界银行数据发布最新报道",
          description: "来源 DOI: 10.1234/example",
        }),
      ),
    ).toEqual({
      citationLanguageVisible: true,
      identifierVisible: true,
      independentReportingMentions: ["Reuters"],
      primarySourceMentions: ["World Bank"],
    });

    expect(
      detectVisibleEvidenceSignals(
        item({
          title: "据说这座城市很适合旅行",
          description: "个人旅行记录",
        }),
      ).citationLanguageVisible,
    ).toBe(false);
  });
});
