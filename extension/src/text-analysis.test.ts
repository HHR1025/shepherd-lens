import { describe, expect, it } from "vitest";
import { countPhraseHits, tokenizeText } from "./text-analysis";

describe("text analysis", () => {
  it("matches complete keywords instead of arbitrary substrings", () => {
    expect(countPhraseHits("A forward-looking travel guide", ["war"])).toBe(0);
    expect(countPhraseHits("A war history documentary", ["war"])).toBe(1);
  });

  it("matches multi-word phrases as token sequences", () => {
    expect(countPhraseHits("Ten secrets you won't believe today", ["you won't believe"])).toBe(1);
    expect(countPhraseHits("You believe this story", ["you won't believe"])).toBe(0);
  });

  it("keeps meaningful Chinese title tokens", () => {
    const tokens = tokenizeText("中国城市旅行攻略", { minLength: 4 });

    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.join("")).toContain("中国");
  });
});
