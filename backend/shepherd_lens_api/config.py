import os
from dataclasses import dataclass
from urllib.parse import urlsplit


@dataclass(frozen=True)
class Settings:
    cors_allowed_origins: tuple[str, ...] = ()

    @classmethod
    def from_env(cls) -> "Settings":
        raw_origins = os.getenv("SHEPHERD_LENS_CORS_ORIGINS", "")
        origins = tuple(
            origin.strip()
            for origin in raw_origins.split(",")
            if origin.strip()
        )
        return cls(cors_allowed_origins=validate_origins(origins))


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
