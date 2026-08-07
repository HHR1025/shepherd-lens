import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Manifest = {
  content_scripts?: Array<{ matches?: string[] }>;
};

describe("extension manifest", () => {
  it("injects only into HTTPS YouTube pages", () => {
    const manifest = JSON.parse(
      readFileSync(resolve("extension/public/manifest.json"), "utf8"),
    ) as Manifest;
    const matches = manifest.content_scripts?.flatMap(
      (contentScript) => contentScript.matches ?? [],
    );

    expect(matches).toEqual([
      "https://youtube.com/*",
      "https://*.youtube.com/*",
    ]);
    expect(matches?.every((match) => match.startsWith("https://"))).toBe(true);
  });
});
