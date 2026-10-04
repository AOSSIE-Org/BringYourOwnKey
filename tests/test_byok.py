import pytest
from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse, PlainTextResponse
from starlette.testclient import TestClient

from byok import BYOKCredentials, BYOKMiddleware, extract_byok, get_byok
from byok._middleware import DEFAULT_SKIP_PATHS


def test_byok_credentials_dataclass():
    creds = BYOKCredentials(api_key="sk-12345", provider="groq", model="llama-3")
    assert creds.api_key == "sk-12345"
    assert creds.provider == "groq"
    assert creds.model == "llama-3"

    # Test default model is None
    creds2 = BYOKCredentials(api_key="sk-abc", provider="openai")
    assert creds2.model is None

    # Test frozen immutability
    with pytest.raises(AttributeError):
        creds.api_key = "new-key"  # type: ignore[misc]


def test_extract_byok_valid_headers():
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/chat",
        "headers": [
            (b"x-byok-api-key", b"gsk_testkey1234567890"),
            (b"x-byok-provider", b"groq"),
            (b"x-byok-model", b"groq/llama-3.3-70b-versatile"),
        ],
    }
    request = Request(scope)
    creds = extract_byok(request)
    assert creds.api_key == "gsk_testkey1234567890"
    assert creds.provider == "groq"
    assert creds.model == "groq/llama-3.3-70b-versatile"


def test_extract_byok_missing_api_key():
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/chat",
        "headers": [
            (b"x-byok-provider", b"groq"),
        ],
    }
    request = Request(scope)
    with pytest.raises(HTTPException) as exc_info:
        extract_byok(request)
    assert exc_info.value.status_code == 401
    assert "Missing API key" in exc_info.value.detail


def test_extract_byok_missing_provider():
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/chat",
        "headers": [
            (b"x-byok-api-key", b"gsk_testkey"),
        ],
    }
    request = Request(scope)
    with pytest.raises(HTTPException) as exc_info:
        extract_byok(request)
    assert exc_info.value.status_code == 401
    assert "Missing provider" in exc_info.value.detail


def test_middleware_type_hints():
    import typing

    hints = typing.get_type_hints(BYOKMiddleware.__init__)
    assert "skip_paths" in hints


def test_middleware_initialization_with_list_or_set():
    # Verify both list and set inputs work without TypeError
    mw_set = BYOKMiddleware(Starlette(), skip_paths={"/custom1"})
    assert "/custom1" in mw_set.skip_paths

    mw_list = BYOKMiddleware(Starlette(), skip_paths=["/custom2"])
    assert "/custom2" in mw_list.skip_paths

    mw_none = BYOKMiddleware(Starlette(), skip_paths=None)
    assert mw_none.skip_paths == DEFAULT_SKIP_PATHS


def test_middleware_request_flow_and_get_byok():
    app = Starlette()
    app.add_middleware(BYOKMiddleware, skip_paths={"/public"})

    async def public_route(request: Request):
        return PlainTextResponse("public")

    async def protected_route(request: Request):
        creds = get_byok()
        return JSONResponse(
            {
                "key": creds.api_key,
                "provider": creds.provider,
                "model": creds.model,
            }
        )

    app.add_route("/public", public_route)
    app.add_route("/protected", protected_route, methods=["GET", "POST"])

    client = TestClient(app)

    # 1. Skip paths bypass auth
    resp = client.get("/public")
    assert resp.status_code == 200
    assert resp.text == "public"

    # Default skip paths bypass auth
    resp = client.get("/health")
    assert resp.status_code in (200, 404)  # Bypasses 401 auth check

    # 2. OPTIONS requests bypass auth
    resp = client.options("/protected")
    assert resp.status_code != 401

    # 3. Missing credentials return 401 JSON error
    resp = client.post("/protected")
    assert resp.status_code == 401
    data = resp.json()
    assert data["error"]["code"] == "BYOK_AUTH_FAILED"
    assert "Missing API key" in data["error"]["message"]

    # 4. Valid credentials succeed and get_byok() retrieves them
    headers = {
        "X-BYOK-Api-Key": "gsk_test123",
        "X-BYOK-Provider": "groq",
        "X-BYOK-Model": "llama-3",
    }
    resp = client.post("/protected", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {
        "key": "gsk_test123",
        "provider": "groq",
        "model": "llama-3",
    }

    # 5. Outside middleware context, get_byok() raises HTTPException(401)
    with pytest.raises(HTTPException) as exc_info:
        get_byok()
    assert exc_info.value.status_code == 401
    assert "No BYOK credentials found" in exc_info.value.detail
