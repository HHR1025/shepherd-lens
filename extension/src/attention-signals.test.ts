import { describe, expect, it } from "vitest";
import {
  calculateAttentionSignals,
  calculateConflictSaturation,
  calculateNoveltyProxy,
  calculateRepetitionDensity,
  calculateShortFormPressure,
  calculateStimulationDensity,
} from "./attention-signals";
import type { FeedItem } from "./feed-item";

function item(overrides: Partial<FeedItem>): FeedItem {
  return {
    title: "Calm city walk",
    channel: "Default Channel",
    description: "",
    duration: "12:00",
    url: "https://www.youtube.com/watch?v=default",
    ...overrides,
  };
}

describe("attention signals", () => {
  it("returns zero-like scores for an empty feed", () => {
    const summary = calculateAttentionSignals([]);

    expect(summary.itemCount).toBe(0);
    expect(summary.signals.every((signal) => signal.value === 0)).toBe(true);
  });

  it("calculates higher stimulation for hook-heavy titles", () => {
    const calm = [item({ title: "Quiet walking tour of an old street" })];
    const intense = [
      item({ title: "BREAKING: 10 shocking secrets you won't believe!!!" }),
    ];

    expect(calculateStimulationDensity(intense)).toBeGreaterThan(
      calculateStimulationDensity(calm),
    );
  });

  it("detects conflict saturation", () => {
    const feed = [
      item({ title: "USA vs China military tensions explained" }),
      item({ title: "Political scandal creates new crisis" }),
    ];

    expect(calculateConflictSaturation(feed)).toBeGreaterThan(60);
  });

  it("recognizes Chinese stimulation and conflict language", () => {
    const calm = [item({ title: "城市公共交通发展记录" })];
    const intense = [
      item({ title: "震惊揭秘：军事冲突危机背后的真相" }),
      item({ title: "史上最大争议事件曝光" }),
    ];

    expect(calculateStimulationDensity(intense)).toBeGreaterThan(
      calculateStimulationDensity(calm),
    );
    expect(calculateConflictSaturation(intense)).toBeGreaterThan(
      calculateConflictSaturation(calm),
    );
  });

  it("does not treat keyword substrings as conflict evidence", () => {
    const feed = [item({ title: "A forward-looking city plan" })];

    expect(calculateConflictSaturation(feed)).toBe(0);
  });

  it("scores novelty higher when titles and channels vary", () => {
    const repetitive = [
      item({ title: "China city city city update", channel: "One" }),
      item({ title: "China city city city news", channel: "One" }),
    ];
    const varied = [
      item({ title: "Urban design in Shenzhen", channel: "Cities" }),
      item({ title: "Ancient food markets in Budapest", channel: "Travel" }),
    ];

    expect(calculateNoveltyProxy(varied)).toBeGreaterThan(calculateNoveltyProxy(repetitive));
  });

  it("scores repetition when channels and title terms repeat", () => {
    const repetitive = [
      item({ title: "China city update", channel: "One" }),
      item({ title: "China city explained", channel: "One" }),
      item({ title: "China city tour", channel: "One" }),
    ];

    expect(calculateRepetitionDensity(repetitive)).toBeGreaterThan(30);
  });

  it("detects short-form pressure from short durations and Shorts URLs", () => {
    const feed = [
      item({ duration: "0:42", url: "https://www.youtube.com/watch?v=short" }),
      item({ duration: "", url: "https://www.youtube.com/shorts/abc" }),
      item({ duration: "20:00", url: "https://www.youtube.com/watch?v=long" }),
    ];

    expect(calculateShortFormPressure(feed)).toBe(67);
  });
});
