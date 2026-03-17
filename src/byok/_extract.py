from starlette.exceptions import HTTPException
from starlette.requests import Request

from ._types import BYOKCredentials


_H_API_KEY = "x-byok-api-key"
_H_PROVIDER = "x-byok-provider"
_H_MODEL = "x-byok-model"


def extract_byok(request: Request) -> BYOKCredentials:
    """Read BYOK headers from a FastAPI/Starlette request.

    Returns a ``BYOKCredentials`` dataclass with the user's key, provider,
    and optional model.

    Raises ``HTTPException(401)`` when the API key or provider header is
    missing, so callers don't need any additional validation.

    Usage::

        @router.post("/my-route")
        async def my_route(request: Request):
            creds = extract_byok(request)
            client = Groq(api_key=creds.api_key)
            ...
    """
    api_key = (request.headers.get(_H_API_KEY) or "").strip()
    provider = (request.headers.get(_H_PROVIDER) or "").strip()
    model = (request.headers.get(_H_MODEL) or "").strip() or None

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Please configure your key in the app settings.",
        )

    if not provider:
        raise HTTPException(
            status_code=401,
            detail="Missing provider. The frontend must send an X-BYOK-Provider header.",
        )

    return BYOKCredentials(api_key=api_key, provider=provider, model=model)
