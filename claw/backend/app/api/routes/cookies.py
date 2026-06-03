"""Cookie 路由。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.cookie_store import get_cookie_store
from app.schemas import CookieImportIn, ProviderStatus

router = APIRouter(prefix="/cookies", tags=["cookies"])


@router.get("")
async def list_all() -> list[ProviderStatus]:
    store = get_cookie_store()
    out: list[ProviderStatus] = []
    for provider, _ in [("deepseek", None), ("qwen", None)]:
        s = store.status(provider)
        if s.get("configured"):
            out.append(ProviderStatus(**s))
        else:
            out.append(ProviderStatus(provider=provider, configured=False))
    return out


@router.get("/{provider}", response_model=ProviderStatus)
async def get_status(provider: str) -> ProviderStatus:
    if provider not in get_cookie_store().SUPPORTED_PROVIDERS:
        raise HTTPException(400, f"Unknown provider: {provider}")
    s = get_cookie_store().status(provider)
    if not s.get("configured"):
        return ProviderStatus(provider=provider, configured=False)
    return ProviderStatus(**s)


@router.post("/import")
async def import_cookies(payload: CookieImportIn) -> dict:
    if payload.provider not in get_cookie_store().SUPPORTED_PROVIDERS:
        raise HTTPException(400, f"Unknown provider: {payload.provider}")
    record = {
        "cookies": [c.model_dump() for c in payload.cookies],
        "headers": payload.headers,
        "user_id": payload.user_id,
    }
    get_cookie_store().save(payload.provider, record)
    return {"ok": True, "provider": payload.provider, "count": len(payload.cookies)}


@router.delete("/{provider}")
async def delete(provider: str) -> dict:
    if provider not in get_cookie_store().SUPPORTED_PROVIDERS:
        raise HTTPException(400, f"Unknown provider: {provider}")
    deleted = get_cookie_store().delete(provider)
    return {"ok": True, "deleted": deleted}
