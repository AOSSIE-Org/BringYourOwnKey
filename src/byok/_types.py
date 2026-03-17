from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class BYOKCredentials:
    """Credentials sent by the frontend via HTTP headers.

    Attributes:
        api_key:  The user's API key (from X-BYOK-Api-Key header).
        provider: Provider identifier, e.g. "groq", "openai" (from X-BYOK-Provider).
        model:    Optional model name (from X-BYOK-Model). None if not sent.
    """

    api_key: str
    provider: str
    model: Optional[str] = None
