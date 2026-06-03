"""Pydantic schemas for API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class MessageIn(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str
    name: str | None = None
    tool_call_id: str | None = None


class ChatRequest(BaseModel):
    provider: str = Field(..., description="deepseek | qwen")
    model: str | None = Field(None, description="可选，指定模型")
    messages: list[MessageIn]
    expert_mode: bool = False
    temperature: float | None = None
    max_tokens: int | None = None
    stream: bool = True
    enable_tools: bool = True


class CookieEntry(BaseModel):
    name: str
    value: str
    domain: str
    path: str = "/"
    expires: float | None = None
    httpOnly: bool | None = None
    secure: bool | None = None
    sameSite: str | None = None


class CookieImportIn(BaseModel):
    provider: str
    cookies: list[CookieEntry]
    headers: dict[str, str] = Field(default_factory=dict)
    user_id: str | None = None


class ProviderInfo(BaseModel):
    name: str
    display_name: str
    domains: list[str]
    supports_expert_mode: bool
    expert_mode_label: str
    configured: bool
    healthy: bool


class ProviderStatus(BaseModel):
    provider: str
    configured: bool
    cookie_count: int | None = None
    domains: list[str] | None = None
    user_id: str | None = None
    updated_at: str | None = None
    expires_at: str | None = None
    healthy: bool | None = None
