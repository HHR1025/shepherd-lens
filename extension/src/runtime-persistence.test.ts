import { describe, expect, it } from "vitest";
import {
  isRuntimePersistenceRequest,
  RUNTIME_PERSISTENCE_MESSAGE,
} from "./runtime-persistence";

const feedItem = {
  title: "Visible recommendation",
  channel: "Channel",
  description: "",
  duration: "10:00",
  url: "https://www.youtube.com/watch?v=test",
};

describe("runtime persistence messages", () => {
  it("accepts supported request shapes", () => {
    expect(
      isRuntimePersistenceRequest({
        type: RUNTIME_PERSISTENCE_MESSAGE,
        operation: "read-state",
      }),
    ).toBe(true);
    expect(
      isRuntimePersistenceRequest({
        type: RUNTIME_PERSISTENCE_MESSAGE,
        operation: "start-experiment",
        feedItems: [feedItem],
        kind: "search",
        note: "test",
        url: "https://www.youtube.com/",
      }),
    ).toBe(true);
  });

  it("rejects malformed cross-context data", () => {
    expect(
      isRuntimePersistenceRequest({
        type: RUNTIME_PERSISTENCE_MESSAGE,
        operation: "save-history",
        feedItems: "not-an-array",
        url: "https://www.youtube.com/",
      }),
    ).toBe(false);
    expect(
      isRuntimePersistenceRequest({
        type: RUNTIME_PERSISTENCE_MESSAGE,
        operation: "start-experiment",
        feedItems: [feedItem],
        kind: "unsupported",
        note: "test",
        url: "https://www.youtube.com/",
      }),
    ).toBe(false);
    expect(
      isRuntimePersistenceRequest({
        type: "another-extension",
        operation: "read-state",
      }),
    ).toBe(false);
  });
});
