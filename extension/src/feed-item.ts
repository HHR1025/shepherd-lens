export type FeedItem = {
  title: string;
  channel: string;
  description: string;
  duration: string;
  url: string;
  id?: string;
  platform?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

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

export function normalizeKey(item: FeedItem) {
  return item.url || `${item.title.toLowerCase()}::${item.channel.toLowerCase()}`;
}
