import { beforeEach, describe, expect, it } from "vitest";
import {
  cleanText,
  extractVisibleFeedItems,
  isDurationText,
  isUsableTitle,
  normalizeKey,
  type FeedItem,
} from "./feed-extractor";

function markVisible(element: Element) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      bottom: 180,
      height: 120,
      left: 0,
      right: 320,
      top: 20,
      width: 320,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    }),
  });
}

function markCardsVisible() {
  for (const card of document.querySelectorAll(
    "ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer",
  )) {
    markVisible(card);
  }
}

describe("feed extractor helpers", () => {
  it("normalizes whitespace", () => {
    expect(cleanText("  A\n\n  title\t with   space  ")).toBe("A title with space");
  });

  it("detects video duration text", () => {
    expect(isDurationText("5:42")).toBe(true);
    expect(isDurationText("1:05:42")).toBe(true);
    expect(isDurationText("China travel vlog")).toBe(false);
  });

  it("rejects invalid titles", () => {
    expect(isUsableTitle("")).toBe(false);
    expect(isUsableTitle("5:42")).toBe(false);
    expect(isUsableTitle("14:01")).toBe(false);
    expect(isUsableTitle("12345")).toBe(false);
  });

  it("accepts normal video titles", () => {
    expect(isUsableTitle("My Real Life in Shenzhen, China")).toBe(true);
  });

  it("prefers URL when normalizing keys", () => {
    const item: FeedItem = {
      title: "Example",
      channel: "Channel",
      description: "",
      duration: "",
      url: "https://www.youtube.com/watch?v=abc",
    };

    expect(normalizeKey(item)).toBe("https://www.youtube.com/watch?v=abc");
  });

  it("falls back to title and channel when no URL exists", () => {
    const item: FeedItem = {
      title: "Example Title",
      channel: "Example Channel",
      description: "",
      duration: "",
      url: "",
    };

    expect(normalizeKey(item)).toBe("example title::example channel");
  });
});

describe("extractVisibleFeedItems", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("extracts a valid YouTube-like homepage card", () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer>
        <a id="video-title-link" href="https://www.youtube.com/watch?v=abc123" title="My Real Life in Shenzhen, China">
          My Real Life in Shenzhen, China
        </a>
        <ytd-channel-name><a href="/@channel">Travel Channel</a></ytd-channel-name>
        <ytd-thumbnail-overlay-time-status-renderer>
          <span id="text">16:30</span>
        </ytd-thumbnail-overlay-time-status-renderer>
      </ytd-rich-item-renderer>
    `;
    markCardsVisible();

    expect(extractVisibleFeedItems()).toEqual([
      {
        title: "My Real Life in Shenzhen, China",
        channel: "Travel Channel",
        description: "",
        duration: "16:30",
        url: "https://www.youtube.com/watch?v=abc123",
      },
    ]);
  });

  it("ignores duration-only title text", () => {
    document.body.innerHTML = `
      <ytd-compact-video-renderer>
        <a href="https://www.youtube.com/watch?v=duration">5:42</a>
        <ytd-thumbnail-overlay-time-status-renderer>
          <span id="text">5:42</span>
        </ytd-thumbnail-overlay-time-status-renderer>
      </ytd-compact-video-renderer>
    `;
    markCardsVisible();

    expect(extractVisibleFeedItems()).toEqual([]);
  });

  it("uses aria-label when visible link text is not a title", () => {
    document.body.innerHTML = `
      <ytd-compact-video-renderer>
        <a href="https://www.youtube.com/watch?v=abc999" aria-label="China's biggest city you haven't heard of">
          20:57
        </a>
        <ytd-channel-name><a href="/@channel">Urban Stories</a></ytd-channel-name>
      </ytd-compact-video-renderer>
    `;
    markCardsVisible();

    expect(extractVisibleFeedItems()[0]).toMatchObject({
      title: "China's biggest city you haven't heard of",
      channel: "Urban Stories",
      url: "https://www.youtube.com/watch?v=abc999",
    });
  });

  it("deduplicates repeated feed items", () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer>
        <a id="video-title-link" href="https://www.youtube.com/watch?v=same" title="Repeated title">Repeated title</a>
      </ytd-rich-item-renderer>
      <ytd-rich-item-renderer>
        <a id="video-title-link" href="https://www.youtube.com/watch?v=same" title="Repeated title">Repeated title</a>
      </ytd-rich-item-renderer>
    `;
    markCardsVisible();

    expect(extractVisibleFeedItems()).toHaveLength(1);
  });
});
