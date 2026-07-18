import { describe, expect, it } from "vitest";
import type { FeedItem } from "./feed-item";
import {
  completeActiveUserExperiment,
  completeExperiment,
  createEmptyUserExperimentState,
  createExperiment,
  readUserExperimentState,
  startUserExperiment,
  trimCompletedExperiments,
  USER_EXPERIMENT_SCHEMA_VERSION,
  type StorageAreaLike,
  type UserExperimentState,
} from "./user-experiment";

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    title: "Calm travel guide",
    channel: "Travel Notes",
    description: "",
    duration: "12:00",
    url: "https://www.youtube.com/watch?v=default",
    ...overrides,
  };
}

function memoryStorage(
  initialState?: UserExperimentState,
): StorageAreaLike & { data: Record<string, unknown> } {
  const storage: StorageAreaLike & { data: Record<string, unknown> } = {
    data: initialState ? { shepherdLensUserExperiments: initialState } : {},
    async get(keys: string[]) {
      return Object.fromEntries(keys.map((key) => [key, storage.data[key]]));
    },
    async set(items: Record<string, unknown>) {
      Object.assign(storage.data, items);
    },
  };

  return storage;
}

describe("user experiment mode", () => {
  it("creates a local experiment with a baseline snapshot", () => {
    const experiment = createExperiment(
      "search",
      "searched for calmer travel videos",
      [item()],
      "https://www.youtube.com/",
      new Date("2026-07-07T00:00:00.000Z"),
    );

    expect(experiment.kind).toBe("search");
    expect(experiment.note).toBe("searched for calmer travel videos");
    expect(experiment.baseline.itemCount).toBe(1);
    expect(experiment.after).toBeNull();
  });

  it("completes an experiment and calculates signal deltas", () => {
    const experiment = createExperiment(
      "watch",
      "",
      [item({ title: "Quiet museum walk", url: "https://www.youtube.com/watch?v=a" })],
      "https://www.youtube.com/",
      new Date("2026-07-07T00:00:00.000Z"),
    );
    const completed = completeExperiment(
      experiment,
      [
        item({
          title: "BREAKING biggest airport mistake exposed!!!",
          url: "https://www.youtube.com/watch?v=b",
        }),
      ],
      "https://www.youtube.com/",
      new Date("2026-07-07T00:05:00.000Z"),
    );
    const stimulation = completed.deltas.find((delta) => delta.id === "stimulation");

    expect(completed.endedAt).toBe("2026-07-07T00:05:00.000Z");
    expect(completed.after?.itemCount).toBe(1);
    expect(stimulation?.delta).toBeGreaterThan(0);
  });

  it("trims completed experiments to the cap", () => {
    const experiments = Array.from({ length: 5 }, (_, index) =>
      createExperiment(
        "note",
        `${index}`,
        [item({ url: `https://www.youtube.com/watch?v=${index}` })],
        "https://www.youtube.com/",
        new Date(1_800_000_000_000 + index),
      ),
    );

    expect(trimCompletedExperiments(experiments, 3).map((experiment) => experiment.note)).toEqual([
      "2",
      "3",
      "4",
    ]);
  });

  it("starts and completes experiments through storage", async () => {
    const storage = memoryStorage();

    await startUserExperiment(
      storage,
      "ignore",
      "ignored repeated recommendations",
      [item({ url: "https://www.youtube.com/watch?v=a" })],
      "https://www.youtube.com/",
      new Date("2026-07-07T00:00:00.000Z"),
    );

    let state = await readUserExperimentState(storage);

    expect(state.version).toBe(USER_EXPERIMENT_SCHEMA_VERSION);
    expect(state.activeExperiment?.kind).toBe("ignore");

    state = await completeActiveUserExperiment(
      storage,
      [item({ url: "https://www.youtube.com/watch?v=b" })],
      "https://www.youtube.com/",
      new Date("2026-07-07T00:10:00.000Z"),
    );

    expect(state.activeExperiment).toBeNull();
    expect(state.experiments).toHaveLength(1);
    expect(state.experiments[0].after?.url).toBe("https://www.youtube.com/");
  });

  it("returns an empty state for invalid storage data", async () => {
    const storage = memoryStorage();
    storage.data.shepherdLensUserExperiments = { experiments: "invalid" };

    await expect(readUserExperimentState(storage)).resolves.toEqual(
      createEmptyUserExperimentState(),
    );
  });

  it("migrates valid legacy experiment state", async () => {
    const storage = memoryStorage();
    const experiment = createExperiment(
      "note",
      "legacy note",
      [item()],
      "https://www.youtube.com/",
      new Date("2026-07-07T00:00:00.000Z"),
    );
    storage.data.shepherdLensUserExperiments = {
      activeExperiment: experiment,
      experiments: [],
    };

    await expect(readUserExperimentState(storage)).resolves.toEqual({
      version: USER_EXPERIMENT_SCHEMA_VERSION,
      activeExperiment: experiment,
      experiments: [],
    });
  });

  it("rejects unsupported future experiment versions", async () => {
    const storage = memoryStorage();
    storage.data.shepherdLensUserExperiments = {
      version: USER_EXPERIMENT_SCHEMA_VERSION + 1,
      activeExperiment: null,
      experiments: [],
    };

    await expect(readUserExperimentState(storage)).resolves.toEqual(
      createEmptyUserExperimentState(),
    );
  });

  it("rejects malformed nested experiment data from storage", async () => {
    const storage = memoryStorage();
    storage.data.shepherdLensUserExperiments = {
      activeExperiment: null,
      experiments: [{ kind: "search", baseline: "invalid" }],
    };

    await expect(readUserExperimentState(storage)).resolves.toEqual(
      createEmptyUserExperimentState(),
    );
  });
});
