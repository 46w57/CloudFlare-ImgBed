"""系统/健康检查路由。"""
from __future__ import annotations

import platform
import sys

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/info")
async def info() -> dict:
    s = get_settings()
    return {
        "app": "Claw Zero Token",
        "version": "0.1.0",
        "python": sys.version,
        "platform": platform.platform(),
        "storage_dir": str(s.storage_dir),
    }


@router.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}
