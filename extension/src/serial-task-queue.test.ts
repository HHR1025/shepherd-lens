import { describe, expect, it } from "vitest";
import { createSerialTaskQueue } from "./serial-task-queue";

describe("createSerialTaskQueue", () => {
  it("runs asynchronous operations one at a time in submission order", async () => {
    const enqueue = createSerialTaskQueue();
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = enqueue(async () => {
      events.push("first:start");
      await firstGate;
      events.push("first:end");
    });
    const second = enqueue(async () => {
      events.push("second:start");
      events.push("second:end");
    });

    await Promise.resolve();
    expect(events).toEqual(["first:start"]);

    releaseFirst?.();
    await Promise.all([first, second]);

    expect(events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("continues after a failed operation", async () => {
    const enqueue = createSerialTaskQueue();
    const events: string[] = [];

    const failed = enqueue(async () => {
      events.push("failed");
      throw new Error("expected failure");
    });
    const recovered = enqueue(async () => {
      events.push("recovered");
      return 42;
    });

    await expect(failed).rejects.toThrow("expected failure");
    await expect(recovered).resolves.toBe(42);
    expect(events).toEqual(["failed", "recovered"]);
  });
});
