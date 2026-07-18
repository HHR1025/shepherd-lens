import type { FeedItem } from "./feed-item";
import {
  createEmptyHistoryState,
  type HistoryState,
} from "./history-tracking";
import type { PlatformAdapter } from "./platform-adapter";
import type { RuntimePersistence } from "./runtime-persistence";
import {
  createEmptyUserExperimentState,
  type ExperimentKind,
  type UserExperimentState,
} from "./user-experiment";

const DEFAULT_MAX_VISIBLE_ITEMS = 60;
const DEFAULT_EXTRACTION_DELAY_MS = 120;

export type ExtensionRuntimeSnapshot = Readonly<{
  experiments: UserExperimentState;
  feedItems: FeedItem[];
  history: HistoryState;
}>;

export type ExtensionRuntimeOptions = {
  adapter: PlatformAdapter;
  getUrl: () => string;
  persistence: RuntimePersistence | null;
  root: ParentNode;
  clearTimeout?: (timer: ReturnType<typeof setTimeout>) => void;
  extractionDelayMs?: number;
  maxVisibleItems?: number;
  onError?: (operation: string, error: unknown) => void;
  setTimeout?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
};

type RuntimeListener = () => void;

export class ExtensionRuntime {
  private readonly adapter: PlatformAdapter;
  private readonly clearTimeoutFn: (timer: ReturnType<typeof setTimeout>) => void;
  private readonly extractionDelayMs: number;
  private readonly getUrl: () => string;
  private readonly listeners = new Set<RuntimeListener>();
  private readonly maxVisibleItems: number;
  private readonly onError: (operation: string, error: unknown) => void;
  private readonly persistence: RuntimePersistence | null;
  private readonly root: ParentNode;
  private readonly setTimeoutFn: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>;
  private extractionTimer: ReturnType<typeof setTimeout> | undefined;
  private observerCleanup: (() => void) | undefined;
  private persistenceCleanup: (() => void) | undefined;
  private pendingSnapshotItems: FeedItem[] | null = null;
  private saveInFlight = false;
  private started = false;
  private snapshot: ExtensionRuntimeSnapshot = {
    experiments: createEmptyUserExperimentState(),
    feedItems: [],
    history: createEmptyHistoryState(),
  };

  constructor(options: ExtensionRuntimeOptions) {
    const clearTimeoutOption = options.clearTimeout;
    const setTimeoutOption = options.setTimeout;

    this.adapter = options.adapter;
    this.clearTimeoutFn = clearTimeoutOption
      ? (timer) => clearTimeoutOption(timer)
      : (timer) => globalThis.clearTimeout(timer);
    this.extractionDelayMs = options.extractionDelayMs ?? DEFAULT_EXTRACTION_DELAY_MS;
    this.getUrl = options.getUrl;
    this.maxVisibleItems = options.maxVisibleItems ?? DEFAULT_MAX_VISIBLE_ITEMS;
    this.onError = options.onError ?? (() => undefined);
    this.persistence = options.persistence;
    this.root = options.root;
    this.setTimeoutFn = setTimeoutOption
      ? (callback, delay) => setTimeoutOption(callback, delay)
      : (callback, delay) => globalThis.setTimeout(callback, delay);
  }

  readonly getSnapshot = () => this.snapshot;

  readonly subscribe = (listener: RuntimeListener) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  start(onPageChange?: () => void) {
    if (this.started) {
      return false;
    }

    this.started = true;
    this.observerCleanup = this.adapter.observeFeedChanges(() => {
      onPageChange?.();
      this.scheduleExtraction();
    });
    this.persistenceCleanup = this.persistence?.subscribe(() => {
      void this.refreshStoredState();
    });

    onPageChange?.();
    this.scheduleExtraction(0);
    void this.refreshStoredState();

    return true;
  }

  stop() {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.observerCleanup?.();
    this.observerCleanup = undefined;
    this.persistenceCleanup?.();
    this.persistenceCleanup = undefined;

    if (this.extractionTimer !== undefined) {
      this.clearTimeoutFn(this.extractionTimer);
      this.extractionTimer = undefined;
    }
  }

  extractNow() {
    const feedItems = this.adapter.extractVisibleItems(this.root, this.maxVisibleItems);
    this.updateSnapshot({ feedItems });
    void this.persistHistorySnapshot(feedItems);

    return feedItems;
  }

  async startExperiment(kind: ExperimentKind, note: string) {
    if (!this.persistence) {
      return this.snapshot.experiments;
    }

    try {
      const experiments = await this.persistence.startExperiment(
        kind,
        note,
        this.snapshot.feedItems,
        this.getUrl(),
      );
      this.updateSnapshot({ experiments });

      return experiments;
    } catch (error) {
      this.onError("start experiment", error);
      return this.snapshot.experiments;
    }
  }

  async completeExperiment() {
    if (!this.persistence) {
      return this.snapshot.experiments;
    }

    try {
      const experiments = await this.persistence.completeExperiment(
        this.snapshot.feedItems,
        this.getUrl(),
      );
      this.updateSnapshot({ experiments });

      return experiments;
    } catch (error) {
      this.onError("complete experiment", error);
      return this.snapshot.experiments;
    }
  }

  private scheduleExtraction(delay = this.extractionDelayMs) {
    if (this.extractionTimer !== undefined) {
      return;
    }

    this.extractionTimer = this.setTimeoutFn(() => {
      this.extractionTimer = undefined;
      this.extractNow();
    }, delay);
  }

  private async refreshStoredState() {
    if (!this.persistence) {
      return;
    }

    try {
      const { experiments, history } = await this.persistence.readState();
      this.updateSnapshot({ experiments, history });
    } catch (error) {
      this.onError("read stored state", error);
    }
  }

  private async persistHistorySnapshot(feedItems: FeedItem[]) {
    if (!this.persistence) {
      return;
    }

    if (this.saveInFlight) {
      this.pendingSnapshotItems = feedItems;
      return;
    }

    this.saveInFlight = true;

    try {
      const history = await this.persistence.saveHistory(
        feedItems,
        this.getUrl(),
      );
      this.updateSnapshot({ history });
    } catch (error) {
      this.onError("save history", error);
    } finally {
      this.saveInFlight = false;

      const pendingItems = this.pendingSnapshotItems;
      this.pendingSnapshotItems = null;

      if (pendingItems) {
        void this.persistHistorySnapshot(pendingItems);
      }
    }
  }

  private updateSnapshot(update: Partial<ExtensionRuntimeSnapshot>) {
    this.snapshot = {
      ...this.snapshot,
      ...update,
    };

    for (const listener of this.listeners) {
      listener();
    }
  }
}
