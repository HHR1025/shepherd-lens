import type { SidebarLanguage } from "./localization";
import {
  EVIDENCE_SEARCH_MESSAGE,
  type EvidenceSearchRequest,
  type EvidenceSearchResponse,
  type EvidenceSearchResult,
} from "./evidence-retrieval";

export type EvidenceRetriever = {
  search(
    query: string,
    language: SidebarLanguage,
  ): Promise<EvidenceSearchResult>;
};

export function createBrowserEvidenceRetriever(): EvidenceRetriever | null {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return null;
  }

  return {
    async search(query, language) {
      const request: EvidenceSearchRequest = {
        type: EVIDENCE_SEARCH_MESSAGE,
        operation: "search",
        language,
        query,
      };
      const response = await chrome.runtime.sendMessage<
        EvidenceSearchRequest,
        EvidenceSearchResponse
      >(request);

      if (!response?.ok) {
        throw new Error(response?.error || "Evidence retrieval failed.");
      }

      return response.value;
    },
  };
}
