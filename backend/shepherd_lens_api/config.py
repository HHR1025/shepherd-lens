import os
from dataclasses import dataclass
from urllib.parse import urlsplit


@dataclass(frozen=True)
class Settings:
    cors_allowed_origins: tuple[str, ...] = ()
    evidence_provider_timeout_seconds: float = 8.0
    evidence_cache_ttl_seconds: float = 300.0
    evidence_cache_capacity: int = 128

    @classmethod
    def from_env(cls) -> "Settings":
        raw_origins = os.getenv("SHEPHERD_LENS_CORS_ORIGINS", "")
        origins = tuple(
            origin.strip()
            for origin in raw_origins.split(",")
            if origin.strip()
        )
        return cls(
            cors_allowed_origins=validate_origins(origins),
            evidence_provider_timeout_seconds=_float_setting(
                "SHEPHERD_LENS_EVIDENCE_TIMEOUT_SECONDS",
                8.0,
                minimum=0.1,
                maximum=30.0,
            ),
            evidence_cache_ttl_seconds=_float_setting(
                "SHEPHERD_LENS_EVIDENCE_CACHE_TTL_SECONDS",
                300.0,
                minimum=1.0,
                maximum=3_600.0,
            ),
            evidence_cache_capacity=_int_setting(
                "SHEPHERD_LENS_EVIDENCE_CACHE_CAPACITY",
                128,
                minimum=1,
                maximum=1_000,
            ),
        )


def validate_origins(origins: tuple[str, ...]) -> tuple[str, ...]:
    for origin in origins:
        if origin == "*":
            raise ValueError("Wildcard CORS origins are not allowed.")
        parsed = urlsplit(origin)
        if (
            parsed.scheme not in {"http", "https", "chrome-extension"}
            or not parsed.netloc
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError(f"Invalid CORS origin: {origin}")
    return origins


def _float_setting(name: str, default: float, minimum: float, maximum: float) -> float:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        value = float(raw_value)
    except ValueError as error:
        raise ValueError(f"{name} must be a number") from error
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value


def _int_setting(name: str, default: int, minimum: int, maximum: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        value = int(raw_value)
    except ValueError as error:
        raise ValueError(f"{name} must be an integer") from error
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value
