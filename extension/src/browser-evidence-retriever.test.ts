import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserEvidenceRetriever } from "./browser-evidence-retriever";
import { EVIDENCE_SEARCH_MESSAGE } from "./evidence-retrieval";

describe("browser evidence retriever", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends only the selected bounded query to the extension background", async () => {
    const sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        providers: {
          crossref: "empty",
          gdelt: "empty",
          wikipedia: "empty",
        },
        query: "air quality",
        sources: [],
      },
    });
    vi.stubGlobal("chrome", { runtime: { sendMessage } });

    const retriever = createBrowserEvidenceRetriever();
    await expect(retriever?.search("air quality", "en")).resolves.toMatchObject({
      query: "air quality",
      sources: [],
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: EVIDENCE_SEARCH_MESSAGE,
      operation: "search",
      language: "en",
      query: "air quality",
    });
  });

  it("rejects failed background responses", async () => {
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({ ok: false, error: "offline" }),
      },
    });

    await expect(
      createBrowserEvidenceRetriever()?.search("air quality", "en"),
    ).rejects.toThrow("offline");
  });
});
