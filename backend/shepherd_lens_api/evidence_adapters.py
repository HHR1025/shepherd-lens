from typing import Any
from urllib.parse import urlsplit, urlunsplit

import httpx

from .models import EvidenceProvider, EvidenceReference, Language

MAX_RESULTS_PER_PROVIDER = 3
PUBLIC_API_USER_AGENT = "Shepherd-Lens/0.1 (+https://github.com/HHR1025/shepherd-lens)"


class EvidenceProviderError(RuntimeError):
    """A public provider could not return a usable bounded response."""


class EvidenceProviderTimeout(EvidenceProviderError):
    """A public provider exceeded the configured request deadline."""


class CrossrefRetrievalAdapter:
    provider: EvidenceProvider = "crossref"

    def __init__(self, client: httpx.AsyncClient, timeout_seconds: float = 8.0) -> None:
        self._client = client
        self._timeout_seconds = timeout_seconds

    async def search(self, query: str, language: Language) -> list[EvidenceReference]:
        del language
        payload = await _get_json(
            self._client,
            "https://api.crossref.org/works",
            {
                "query.bibliographic": query,
                "rows": str(MAX_RESULTS_PER_PROVIDER),
            },
            self._timeout_seconds,
            "Crossref",
        )
        message = payload.get("message") if isinstance(payload, dict) else None
        items = message.get("items") if isinstance(message, dict) else None
        if not isinstance(items, list):
            raise EvidenceProviderError("Crossref returned an invalid response.")

        results: list[EvidenceReference] = []
        for item in items[:MAX_RESULTS_PER_PROVIDER]:
            reference = _normalize_crossref_item(item)
            if reference is not None:
                results.append(reference)
        return results


class WikipediaRetrievalAdapter:
    provider: EvidenceProvider = "wikipedia"

    def __init__(self, client: httpx.AsyncClient, timeout_seconds: float = 8.0) -> None:
        self._client = client
        self._timeout_seconds = timeout_seconds

    async def search(self, query: str, language: Language) -> list[EvidenceReference]:
        hostname = "zh.wikipedia.org" if language == "zh" else "en.wikipedia.org"
        payload = await _get_json(
            self._client,
            f"https://{hostname}/w/api.php",
            {
                "action": "query",
                "format": "json",
                "list": "search",
                "origin": "*",
                "srlimit": str(MAX_RESULTS_PER_PROVIDER),
                "srsearch": query,
                "utf8": "1",
            },
            self._timeout_seconds,
            "Wikipedia",
        )
        query_result = payload.get("query") if isinstance(payload, dict) else None
        items = query_result.get("search") if isinstance(query_result, dict) else None
        if not isinstance(items, list):
            raise EvidenceProviderError("Wikipedia returned an invalid response.")

        results: list[EvidenceReference] = []
        for item in items[:MAX_RESULTS_PER_PROVIDER]:
            if not isinstance(item, dict):
                continue
            page_id = item.get("pageid")
            title = _bounded_text(item.get("title"), 300)
            if (
                isinstance(page_id, bool)
                or not isinstance(page_id, int)
                or page_id <= 0
                or not title
            ):
                continue
            results.append(
                EvidenceReference(
                    title=title,
                    url=f"https://{hostname}/?curid={page_id}",
                    provider=self.provider,
                    category="reference",
                    source_name="Wikipedia",
                )
            )
        return results


async def _get_json(
    client: httpx.AsyncClient,
    url: str,
    params: dict[str, str],
    timeout_seconds: float,
    provider_name: str,
) -> Any:
    try:
        response = await client.get(
            url,
            params=params,
            timeout=timeout_seconds,
            headers={"Accept": "application/json", "User-Agent": PUBLIC_API_USER_AGENT},
        )
        response.raise_for_status()
        return response.json()
    except httpx.TimeoutException as error:
        raise EvidenceProviderTimeout(f"{provider_name} timed out.") from error
    except (httpx.HTTPError, ValueError) as error:
        raise EvidenceProviderError(f"{provider_name} request failed.") from error


def _normalize_crossref_item(value: Any) -> EvidenceReference | None:
    if not isinstance(value, dict):
        return None
    raw_titles = value.get("title")
    title = (
        _bounded_text(raw_titles[0], 300)
        if isinstance(raw_titles, list) and raw_titles
        else ""
    )
    safe_url = _safe_http_url(value.get("URL"))
    if not title or safe_url is None:
        return None
    return EvidenceReference(
        title=title,
        url=safe_url,
        provider="crossref",
        category="research",
        source_name=_bounded_text(value.get("publisher"), 200) or "Crossref",
    )


def _bounded_text(value: Any, maximum: int) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:maximum]


def _safe_http_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
    ):
        return None
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ""))
