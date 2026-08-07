import { isRecord, isString } from "./runtime-schema";
import type { SidebarLanguage } from "./localization";

export const EVIDENCE_SEARCH_MESSAGE = "shepherd-lens-evidence-search";
export const MAX_EVIDENCE_RESULTS_PER_PROVIDER = 3;
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_QUERY_LENGTH = 180;

export type EvidenceProvider = "crossref" | "wikipedia" | "gdelt";
export type EvidenceCategory = "research" | "reference" | "reporting";
export type EvidenceProviderStatus = "success" | "empty" | "error";

export type EvidenceSource = {
  category: EvidenceCategory;
  provider: EvidenceProvider;
  publishedAt: string | null;
  sourceName: string;
  title: string;
  url: string;
};

export type EvidenceSearchResult = {
  providers: Record<EvidenceProvider, EvidenceProviderStatus>;
  query: string;
  sources: EvidenceSource[];
};

export type EvidenceSearchRequest = {
  type: typeof EVIDENCE_SEARCH_MESSAGE;
  operation: "search";
  language: SidebarLanguage;
  query: string;
};

export type EvidenceSearchResponse =
  | { ok: true; value: EvidenceSearchResult }
  | { ok: false; error: string };

type RetrievalOptions = {
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export function isEvidenceSearchRequest(
  value: unknown,
): value is EvidenceSearchRequest {
  return (
    isRecord(value) &&
    value.type === EVIDENCE_SEARCH_MESSAGE &&
    value.operation === "search" &&
    (value.language === "en" || value.language === "zh") &&
    isString(value.query) &&
    value.query.trim().length > 0 &&
    value.query.length <= MAX_QUERY_LENGTH
  );
}

export async function retrieveEvidence(
  query: string,
  language: SidebarLanguage,
  options: RetrievalOptions = {},
): Promise<EvidenceSearchResult> {
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const tasks = [
    retrieveProvider("crossref", () =>
      retrieveCrossref(query, fetcher, timeoutMs),
    ),
    retrieveProvider("wikipedia", () =>
      retrieveWikipedia(query, language, fetcher, timeoutMs),
    ),
    retrieveProvider("gdelt", () => retrieveGdelt(query, fetcher, timeoutMs)),
  ] as const;
  const providerResults = await Promise.all(tasks);
  const providers = {
    crossref: providerResults[0].status,
    wikipedia: providerResults[1].status,
    gdelt: providerResults[2].status,
  };
  const sources = deduplicateSources(
    providerResults.flatMap((result) => result.sources),
  );

  return { providers, query, sources };
}

async function retrieveProvider(
  provider: EvidenceProvider,
  retrieve: () => Promise<EvidenceSource[]>,
) {
  try {
    const sources = await retrieve();
    return {
      provider,
      sources,
      status: sources.length > 0 ? "success" : "empty",
    } as const;
  } catch {
    return { provider, sources: [], status: "error" } as const;
  }
}

async function retrieveCrossref(
  query: string,
  fetcher: typeof fetch,
  timeoutMs: number,
) {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", query);
  url.searchParams.set("rows", String(MAX_EVIDENCE_RESULTS_PER_PROVIDER));
  const value = await fetchJson(url, fetcher, timeoutMs);
  const message = isRecord(value) && isRecord(value.message) ? value.message : null;
  const items = message && Array.isArray(message.items) ? message.items : null;

  if (!items) {
    throw new Error("Invalid Crossref response.");
  }

  return items.flatMap((item) => normalizeCrossrefItem(item));
}

function normalizeCrossrefItem(value: unknown): EvidenceSource[] {
  if (!isRecord(value)) {
    return [];
  }

  const title = firstString(value.title);
  const doi = isString(value.DOI) ? value.DOI : "";
  const candidateUrl = isString(value.URL)
    ? value.URL
    : doi
      ? `https://doi.org/${doi}`
      : "";
  const url = normalizeSafeUrl(candidateUrl);

  if (!title || !url) {
    return [];
  }

  return [
    {
      category: "research",
      provider: "crossref",
      publishedAt: crossrefDate(value.published),
      sourceName: isString(value.publisher) ? value.publisher : "Crossref",
      title,
      url,
    },
  ];
}

async function retrieveWikipedia(
  query: string,
  language: SidebarLanguage,
  fetcher: typeof fetch,
  timeoutMs: number,
) {
  const hostname = language === "zh" ? "zh.wikipedia.org" : "en.wikipedia.org";
  const url = new URL(`https://${hostname}/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("list", "search");
  url.searchParams.set("origin", "*");
  url.searchParams.set("srlimit", String(MAX_EVIDENCE_RESULTS_PER_PROVIDER));
  url.searchParams.set("srsearch", query);
  url.searchParams.set("utf8", "1");
  const value = await fetchJson(url, fetcher, timeoutMs);
  const queryResult = isRecord(value) && isRecord(value.query) ? value.query : null;
  const results = queryResult && Array.isArray(queryResult.search)
    ? queryResult.search
    : null;

  if (!results) {
    throw new Error("Invalid Wikipedia response.");
  }

  return results.flatMap((result) => {
    if (
      !isRecord(result) ||
      !isString(result.title) ||
      !Number.isInteger(result.pageid) ||
      (result.pageid as number) <= 0
    ) {
      return [];
    }

    return [{
      category: "reference" as const,
      provider: "wikipedia" as const,
      publishedAt: null,
      sourceName: "Wikipedia",
      title: result.title,
      url: `https://${hostname}/?curid=${result.pageid}`,
    }];
  });
}

async function retrieveGdelt(
  query: string,
  fetcher: typeof fetch,
  timeoutMs: number,
) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(MAX_EVIDENCE_RESULTS_PER_PROVIDER));
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("query", query);
  url.searchParams.set("sort", "hybridrel");
  const value = await fetchJson(url, fetcher, timeoutMs);
  const articles = isRecord(value) && Array.isArray(value.articles)
    ? value.articles
    : null;

  if (!articles) {
    throw new Error("Invalid GDELT response.");
  }

  return articles.flatMap((article) => normalizeGdeltArticle(article));
}

function normalizeGdeltArticle(value: unknown): EvidenceSource[] {
  if (!isRecord(value) || !isString(value.title) || !isString(value.url)) {
    return [];
  }

  const url = normalizeSafeUrl(value.url);

  if (!url) {
    return [];
  }

  return [{
    category: "reporting",
    provider: "gdelt",
    publishedAt: gdeltDate(value.seendate),
    sourceName: isString(value.domain) ? value.domain : new URL(url).hostname,
    title: value.title,
    url,
  }];
}

async function fetchJson(
  url: URL,
  fetcher: typeof fetch,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Evidence provider timed out."));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetcher(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
      timeout,
    ]);

    if (!response.ok) {
      throw new Error(`Evidence provider returned ${response.status}.`);
    }

    return await response.json() as unknown;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function deduplicateSources(sources: EvidenceSource[]) {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = source.url.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeSafeUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    if (!url.hostname || url.username || url.password) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function firstString(value: unknown) {
  return Array.isArray(value) && isString(value[0]) ? value[0] : "";
}

function crossrefDate(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value["date-parts"])) {
    return null;
  }

  const parts = value["date-parts"][0];

  if (!Array.isArray(parts) || !Number.isInteger(parts[0])) {
    return null;
  }

  const [year, month = 1, day = 1] = parts;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function gdeltDate(value: unknown) {
  if (!isString(value)) {
    return null;
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/u);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}
