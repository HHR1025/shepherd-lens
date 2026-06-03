import { describe, expect, it } from "vitest";
import {
  calculateChannelConcentration,
  calculateLocalMeasurements,
  calculateSourceDiversity,
  calculateTitleHookDensity,
  calculateTopicConcentration,
  calculateVisibleFeedEntropy,
  topicTokens,
} from "./local-measurements";
import type { FeedItem } from "./feed-extractor";

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    title: "Calm city travel guide",
    channel: "Travel Notes",
    description: "",
    duration: "12:00",
    url: "https://www.youtube.com/watch?v=default",
    ...overrides,
  };
}

describe("local measurements", () => {
  it("calculates the full local measurement set", () => {
    const summary = calculateLocalMeasurements([item()]);

    expect(summary.itemCount).toBe(1);
    expect(summary.metrics.map((metric) => metric.id)).toEqual([
      "channel_concentration",
      "topic_concentration",
      "visible_feed_entropy",
      "source_diversity",
      "title_hook_density",
    ]);
  });

  it("detects channel concentration", () => {
    const metric = calculateChannelConcentration([
      item({ channel: "Travel Notes" }),
      item({ channel: "Travel Notes" }),
      item({ channel: "City Archive" }),
    ]);

    expect(metric.value).toBeGreaterThan(60);
    expect(metric.evidence[0]).toContain("Travel Notes");
  });

  it("detects topic concentration from local title tokens", () => {
    const metric = calculateTopicConcentration([
      item({ title: "Athens travel guide" }),
      item({ title: "Athens food guide" }),
      item({ title: "Athens airport mistakes" }),
    ]);

    expect(metric.value).toBeGreaterThan(30);
    expect(metric.evidence).toContain("athens");
  });

  it("estimates visible feed entropy", () => {
    const metric = calculateVisibleFeedEntropy([
      item({ title: "Athens travel guide", channel: "A" }),
      item({ title: "Tokyo food walk", channel: "B" }),
      item({ title: "Paris museum tour", channel: "C" }),
    ]);

    expect(metric.value).toBeGreaterThan(70);
  });

  it("calculates source diversity", () => {
    const metric = calculateSourceDiversity([
      item({ channel: "A" }),
      item({ channel: "B" }),
      item({ channel: "C" }),
      item({ channel: "C" }),
    ]);

    expect(metric.value).toBe(75);
  });

  it("detects title hook density", () => {
    const metric = calculateTitleHookDensity([
      item({ title: "BREAKING insane secret travel warning!!! 2026" }),
      item({ title: "Quiet museum walk" }),
    ]);

    expect(metric.value).toBe(50);
    expect(metric.evidence[0]).toContain("BREAKING");
  });

  it("filters topic stop words", () => {
    expect(topicTokens("What to know before your travel guide")).toEqual([
      "know",
      "travel",
      "guide",
    ]);
  });
});
