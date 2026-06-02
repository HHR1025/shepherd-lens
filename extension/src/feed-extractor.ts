export type FeedItem = {
  title: string;
  channel: string;
  description: string;
  duration: string;
  url: string;
};

const candidateSelectors = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-playlist-video-renderer",
  "yt-lockup-view-model",
];

export function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function isDurationText(value: string) {
  return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(cleanText(value));
}

export function isUsableTitle(value: string) {
  const title = cleanText(value);

  return title.length >= 4 && !isDurationText(title) && !/^\d+[\d:.\s]*$/.test(title);
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

export function normalizeKey(item: FeedItem) {
  return item.url || `${item.title.toLowerCase()}::${item.channel.toLowerCase()}`;
}

export function extractVisibleFeedItems(root: ParentNode = document, maxItems = 60) {
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
