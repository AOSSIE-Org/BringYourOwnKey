"""byok — Bring Your Own Key.

A tiny library that lets users supply their own LLM API keys.

Quick start (per-route)::

    from byok import extract_byok

    @router.post("/chat")
    async def chat(request: Request):
        creds = extract_byok(request)
        # creds.api_key, creds.provider, creds.model
        client = YourLLM(api_key=creds.api_key)
        ...

Quick start (middleware — auto-protect all routes)::

    from byok import BYOKMiddleware, get_byok

    app.add_middleware(BYOKMiddleware)

    @router.post("/chat")
    async def chat():
        creds = get_byok()
        ...
"""

from ._types import BYOKCredentials
from ._extract import extract_byok
from ._middleware import BYOKMiddleware, get_byok

__all__ = ["BYOKCredentials", "extract_byok", "BYOKMiddleware", "get_byok"]
