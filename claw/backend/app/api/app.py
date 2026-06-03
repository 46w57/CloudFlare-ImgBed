"""FastAPI app 入口。"""
from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.api.routes import chat, cookies, providers, system
from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.ensure_dirs()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Claw Zero Token API",
        version="0.1.0",
        description="本地多模型代理后端",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(system.router, prefix="/api")
    app.include_router(providers.router, prefix="/api")
    app.include_router(cookies.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")
    return app


app = create_app()
