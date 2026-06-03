export {
  cleanText,
  isDurationText,
  isUsableTitle,
  normalizeKey,
  type FeedItem,
} from "./feed-item";

export {
  extractYouTubeVisibleItems as extractVisibleFeedItems,
  findChannel,
  findDescription,
  findDuration,
  findTitle,
  findVideoUrl,
  isVisible,
} from "./platforms/youtube-adapter";
