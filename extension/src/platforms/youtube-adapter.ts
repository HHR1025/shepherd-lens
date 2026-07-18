import {
  cleanText,
  isDurationText,
  isUsableTitle,
  normalizeKey,
  type FeedItem,
} from "../feed-item";
import type { PlatformAdapter } from "../platform-adapter";

const candidateSelectors = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-playlist-video-renderer",
  "yt-lockup-view-model",
];

export const youtubeAdapter: PlatformAdapter = {
  platform: "youtube",

  detectPage(urlValue = window.location.href) {
    try {
      const url = new URL(urlValue);

      return (
        url.hostname === "youtube.com" ||
        url.hostname.endsWith(".youtube.com") ||
        url.hostname === "youtu.be"
      );
    } catch {
      return false;
    }
  },

  extractVisibleItems(root: ParentNode = document, maxItems = 60) {
    return extractYouTubeVisibleItems(root, maxItems);
  },

  observeFeedChanges(callback: () => void) {
    window.addEventListener("yt-navigate-finish", callback);
    window.addEventListener("yt-page-data-updated", callback);
    window.addEventListener("popstate", callback);
    window.addEventListener("scroll", callback, { passive: true });
    window.addEventListener("resize", callback);

    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener("yt-navigate-finish", callback);
      window.removeEventListener("yt-page-data-updated", callback);
      window.removeEventListener("popstate", callback);
      window.removeEventListener("scroll", callback);
      window.removeEventListener("resize", callback);
      observer.disconnect();
    };
  },

  getPlatformMetadata() {
    return {
      id: "youtube",
      name: "YouTube",
      url: window.location.href,
    };
  },
};

export function extractYouTubeVisibleItems(root: ParentNode = document, maxItems = 60) {
  const seen = new Set<string>();
  const items: FeedItem[] = [];

  for (const selector of candidateSelectors) {
    for (const container of root.querySelectorAll(selector)) {
      if (!isVisible(container)) {
        continue;
      }

      const title = findTitle(container);

      if (!isUsableTitle(title)) {
        continue;
      }

      const item: FeedItem = {
        title,
        channel: findChannel(container),
        description: findDescription(container),
        duration: findDuration(container),
        url: findVideoUrl(container),
      };
      const key = normalizeKey(item);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      items.push(item);

      if (items.length >= maxItems) {
        return items;
      }
    }
  }

  return items;
}

export function isVisible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

export function findVideoUrl(container: Element) {
  const anchor = container.querySelector<HTMLAnchorElement>(
    'a#video-title[href], a#video-title-link[href], a[href*="/watch?v="], a[href*="/shorts/"]',
  );

  if (!anchor?.href) {
    return "";
  }

  try {
    const url = new URL(anchor.href, window.location.origin);

    if (url.pathname.startsWith("/shorts/")) {
      return `${url.origin}${url.pathname}`;
    }

    if (url.searchParams.has("v")) {
      return `${url.origin}${url.pathname}?v=${url.searchParams.get("v")}`;
    }

    return `${url.origin}${url.pathname}`;
  } catch {
    return anchor.href;
  }
}

export function findTitle(container: Element) {
  const titleSelectors = [
    "#video-title",
    "a#video-title-link",
    "h3 #video-title",
    "h3 a[href*='/watch']",
    "h3 a[href*='/shorts']",
    "yt-formatted-string#video-title",
    "yt-lockup-metadata-view-model h3 a",
  ];

  for (const selector of titleSelectors) {
    const titleElement = container.querySelector<HTMLElement>(selector);
    const title = cleanText(
      titleElement?.getAttribute("title") ||
        titleElement?.getAttribute("aria-label") ||
        titleElement?.textContent,
    );

    if (isUsableTitle(title)) {
      return title;
    }
  }

  for (const anchor of container.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/watch?v="], a[href*="/shorts/"]',
  )) {
    const title = cleanText(anchor.getAttribute("title") || anchor.getAttribute("aria-label"));

    if (isUsableTitle(title)) {
      return title;
    }
  }

  return "";
}

export function findChannel(container: Element) {
  const channelElement = container.querySelector<HTMLElement>(
    'ytd-channel-name a, #channel-name a, a[href^="/@"], a[href*="/channel/"], a[href*="/c/"]',
  );

  return cleanText(channelElement?.textContent);
}

export function findDuration(container: Element) {
  const durationElement = container.querySelector<HTMLElement>(
    "ytd-thumbnail-overlay-time-status-renderer #text, ytd-thumbnail-overlay-time-status-renderer, .badge-shape-wiz__text",
  );
  const duration = cleanText(durationElement?.textContent);

  return isDurationText(duration) ? duration : "";
}

export function findDescription(container: Element) {
  const descriptionElement = container.querySelector<HTMLElement>(
    "#description-text, yt-formatted-string.metadata-snippet-text, #description, .metadata-snippet-text",
  );

  return cleanText(descriptionElement?.textContent);
}
