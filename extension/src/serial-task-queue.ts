export function createSerialTaskQueue() {
  let queue: Promise<void> = Promise.resolve();

  return function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);

    queue = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  };
}
