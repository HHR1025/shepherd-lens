import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivePlatformAdapter } from ".";
import { youtubeAdapter } from "./youtube-adapter";

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

describe("youtube platform adapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("detects YouTube pages", () => {
    expect(youtubeAdapter.detectPage("https://www.youtube.com/watch?v=abc")).toBe(true);
    expect(youtubeAdapter.detectPage("https://youtu.be/abc")).toBe(true);
    expect(youtubeAdapter.detectPage("https://example.com")).toBe(false);
  });

  it("is selected as the active adapter for YouTube URLs", () => {
    expect(getActivePlatformAdapter("https://www.youtube.com/").platform).toBe("youtube");
  });

  it("extracts visible YouTube feed items through the adapter interface", () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer>
        <a id="video-title-link" href="https://www.youtube.com/watch?v=adapter" title="Adapter architecture test">
          Adapter architecture test
        </a>
        <ytd-channel-name><a href="/@channel">Architecture Channel</a></ytd-channel-name>
      </ytd-rich-item-renderer>
    `;
    const card = document.querySelector("ytd-rich-item-renderer");

    if (card) {
      markVisible(card);
    }

    expect(youtubeAdapter.extractVisibleItems()).toEqual([
      {
        title: "Adapter architecture test",
        channel: "Architecture Channel",
        description: "",
        duration: "",
        url: "https://www.youtube.com/watch?v=adapter",
      },
    ]);
  });

  it("returns a cleanup function for platform change observation", () => {
    const callback = vi.fn();
    const cleanup = youtubeAdapter.observeFeedChanges(callback);

    expect(typeof cleanup).toBe("function");

    cleanup();
  });
});
