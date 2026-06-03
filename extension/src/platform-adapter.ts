import type { FeedItem } from "./feed-item";

export type PlatformMetadata = {
  id: string;
  name: string;
  url: string;
};

export type PlatformAdapter = {
  platform: string;
  detectPage(url?: string): boolean;
  extractVisibleItems(root?: ParentNode, maxItems?: number): FeedItem[];
  observeFeedChanges(callback: () => void): () => void;
  getPlatformMetadata(): PlatformMetadata;
};
