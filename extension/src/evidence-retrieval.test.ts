import { describe, expect, it, vi } from "vitest";
import {
  EVIDENCE_SEARCH_MESSAGE,
  isEvidenceSearchRequest,
  retrieveEvidence,
} from "./evidence-retrieval";

describe("evidence retrieval messages", () => {
  it("accepts bounded supported searches and rejects malformed requests", () => {
    expect(
      isEvidenceSearchRequest({
        type: EVIDENCE_SEARCH_MESSAGE,
        operation: "search",
        language: "zh",
        query: "空气质量",
      }),
    ).toBe(true);
    expect(
      isEvidenceSearchRequest({
        type: EVIDENCE_SEARCH_MESSAGE,
        operation: "search",
        language: "en",
        query: "x".repeat(181),
      }),
    ).toBe(false);
    expect(
      isEvidenceSearchRequest({
        type: EVIDENCE_SEARCH_MESSAGE,
        operation: "search",
        language: "fr",
        query: "air quality",
      }),
    ).toBe(false);
  });
});

describe("public evidence retrieval", () => {
  it("normalizes, categorizes, and deduplicates provider results", async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://api.crossref.org/works")) {
        return jsonResponse({
          message: {
            items: [
              {
                DOI: "10.1000/example",
                URL: "https://doi.org/10.1000/example",
                title: ["Air quality research"],
                publisher: "Example Press",
                published: { "date-parts": [[2025, 3, 2]] },
              },
              {
                DOI: "10.1000/example",
                URL: "https://doi.org/10.1000/example",
                title: ["Duplicate"],
              },
            ],
          },
        });
      }

      if (url.startsWith("https://en.wikipedia.org/w/api.php")) {
        return jsonResponse({
          query: {
            search: [{ pageid: 42, title: "Air quality" }],
          },
        });
      }

      return jsonResponse({
        articles: [
          {
            title: "Recent reporting",
            url: "https://www.reuters.com/world/example",
            domain: "reuters.com",
            seendate: "20250701T120000Z",
          },
          {
            title: "Unsafe result",
            url: "javascript:alert(1)",
            domain: "example.com",
          },
        ],
      });
    });

    const result = await retrieveEvidence("air quality", "en", {
      fetch,
      timeoutMs: 100,
    });

    expect(result.sources).toEqual([
      {
        category: "research",
        provider: "crossref",
        publishedAt: "2025-03-02",
        sourceName: "Example Press",
        title: "Air quality research",
        url: "https://doi.org/10.1000/example",
      },
      {
        category: "reference",
        provider: "wikipedia",
        publishedAt: null,
        sourceName: "Wikipedia",
        title: "Air quality",
        url: "https://en.wikipedia.org/?curid=42",
      },
      {
        category: "reporting",
        provider: "gdelt",
        publishedAt: "2025-07-01T12:00:00.000Z",
        sourceName: "reuters.com",
        title: "Recent reporting",
        url: "https://www.reuters.com/world/example",
      },
    ]);
    expect(result.providers).toEqual({
      crossref: "success",
      gdelt: "success",
      wikipedia: "success",
    });
  });

  it("preserves successful providers when another provider fails", async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("crossref")) {
        throw new Error("offline");
      }

      if (url.includes("wikipedia")) {
        return jsonResponse({ query: { search: [] } });
      }

      return jsonResponse({ articles: [] });
    });

    const result = await retrieveEvidence("air quality", "en", {
      fetch,
      timeoutMs: 100,
    });

    expect(result.sources).toEqual([]);
    expect(result.providers).toEqual({
      crossref: "error",
      gdelt: "empty",
      wikipedia: "empty",
    });
  });

  it("times out a stalled provider without rejecting the whole search", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn((input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("crossref")) {
        return new Promise<Response>(() => undefined);
      }

      return Promise.resolve(
        jsonResponse(url.includes("wikipedia") ? { query: { search: [] } } : { articles: [] }),
      );
    });

    const pending = retrieveEvidence("air quality", "en", {
      fetch,
      timeoutMs: 50,
    });
    await vi.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toMatchObject({
      providers: {
        crossref: "error",
        gdelt: "empty",
        wikipedia: "empty",
      },
    });
    vi.useRealTimers();
  });
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
