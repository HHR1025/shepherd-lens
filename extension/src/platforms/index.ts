import { youtubeAdapter } from "./youtube-adapter";
import type { PlatformAdapter } from "../platform-adapter";

const platformAdapters: PlatformAdapter[] = [youtubeAdapter];

export function getActivePlatformAdapter(url = window.location.href) {
  return platformAdapters.find((adapter) => adapter.detectPage(url)) ?? youtubeAdapter;
}

export { platformAdapters, youtubeAdapter };
