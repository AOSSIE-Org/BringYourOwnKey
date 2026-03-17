"""Optional FastAPI middleware that auto-extracts BYOK credentials for every request.

If you prefer explicit per-route extraction, use ``extract_byok()`` instead.
"""

from __future__ import annotations

from contextvars import ContextVar
from typing import Optional, Set

from starlette.exceptions import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from ._types import BYOKCredentials
from ._extract import extract_byok

_ctx: ContextVar[Optional[BYOKCredentials]] = ContextVar("byok_ctx", default=None)


DEFAULT_SKIP_PATHS: Set[str] = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


class BYOKMiddleware(BaseHTTPMiddleware):
    """Starlette/FastAPI middleware that extracts BYOK headers on every request.

    Credentials are stored in a context variable and retrieved via ``get_byok()``.

    Usage::

        app.add_middleware(BYOKMiddleware)

        @router.post("/bias")
        async def bias(request: Request):
            creds = get_byok()
            ...

    Parameters:
        skip_paths: Extra paths (besides the defaults) to skip auth for.
    """

    def __init__(self, app, skip_paths: Optional[Set[str]] = None) -> None:  # type: ignore[override]
        super().__init__(app)
        self.skip_paths = DEFAULT_SKIP_PATHS | (skip_paths or set())

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method == "OPTIONS" or request.url.path in self.skip_paths:
            return await call_next(request)

        try:
            creds = extract_byok(request)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"error": {"message": exc.detail, "code": "BYOK_AUTH_FAILED"}},
            )

        token = _ctx.set(creds)
        try:
            return await call_next(request)
        finally:
            _ctx.reset(token)


def get_byok() -> BYOKCredentials:
    """Retrieve BYOK credentials set by ``BYOKMiddleware`` for the current request.

    Raises ``HTTPException(401)`` if called outside a middleware-protected request.
    """
    ctx = _ctx.get()
    if ctx is None:
        raise HTTPException(
            status_code=401,
            detail="No BYOK credentials found. Is BYOKMiddleware installed?",
        )
    return ctx
