"""Provider 路由：列出、检测健康度。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.providers.registry import get_provider, list_providers
from app.schemas import ProviderInfo, ProviderStatus
from app.core.cookie_store import get_cookie_store

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("", response_model=list[ProviderInfo])
async def providers_list() -> list[ProviderInfo]:
    return [ProviderInfo(**p) for p in list_providers()]


@router.get("/{name}", response_model=ProviderInfo)
async def provider_detail(name: str) -> ProviderInfo:
    for p in list_providers():
        if p["name"] == name:
            return ProviderInfo(**p)
    raise HTTPException(404, f"Unknown provider: {name}")


@router.get("/{name}/status", response_model=ProviderStatus)
async def provider_status(name: str) -> ProviderStatus:
    status = get_cookie_store().status(name)
    if not status.get("configured"):
        return ProviderStatus(provider=name, configured=False)
    return ProviderStatus(**status)


@router.post("/{name}/validate")
async def provider_validate(name: str) -> dict:
    provider = get_provider(name)
    if provider is None:
        raise HTTPException(404, f"Unknown provider: {name}")
    ok = await provider.validate()
    return {"provider": name, "healthy": ok}
