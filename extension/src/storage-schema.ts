import { isRecord } from "./runtime-schema";

export class UnsupportedStorageSchemaError extends Error {
  readonly currentVersion: number;
  readonly storedVersion: number;
  readonly storageKey: string;

  constructor(storageKey: string, storedVersion: number, currentVersion: number) {
    super(
      `Unsupported ${storageKey} schema version ${storedVersion}; current version is ${currentVersion}.`,
    );
    this.name = "UnsupportedStorageSchemaError";
    this.storageKey = storageKey;
    this.storedVersion = storedVersion;
    this.currentVersion = currentVersion;
  }
}

export function assertSupportedStorageVersion(
  value: unknown,
  storageKey: string,
  currentVersion: number,
) {
  if (
    isRecord(value) &&
    typeof value.version === "number" &&
    Number.isFinite(value.version) &&
    value.version > currentVersion
  ) {
    throw new UnsupportedStorageSchemaError(
      storageKey,
      value.version,
      currentVersion,
    );
  }
}
