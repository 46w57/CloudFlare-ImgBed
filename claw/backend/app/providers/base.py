"""Provider 抽象层。

所有 AI 平台适配器都继承 `BaseProvider`：
- name: 唯一标识
- domains: 该 provider 的 cookie 域名列表
- supports_expert_mode: 是否支持专家/思考模式
- chat(messages, **kwargs) -> AsyncIterator[ChatChunk]
- validate_cookies(cookies) -> bool
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant" | "tool"
    content: str
    name: str | None = None
    tool_call_id: str | None = None
    tool_calls: list[dict] | None = None  # 由 assistant 发出


@dataclass
class ToolSpec:
    name: str
    description: str
    parameters: dict  # JSON Schema


@dataclass
class ChatRequest:
    messages: list[ChatMessage]
    model: str = "default"
    expert_mode: bool = False
    stream: bool = True
    tools: list[ToolSpec] = field(default_factory=list)
    temperature: float | None = None
    max_tokens: int | None = None
    # 元信息
    session_id: str | None = None


@dataclass
class ChatChunk:
    """流式响应的最小单元。"""

    delta: str = ""
    is_thinking: bool = False  # 当前 delta 属于"思考"内容
    tool_call: dict | None = None  # 如果模型决定调用工具
    finish_reason: str | None = None
    error: str | None = None
    # 整次响应的累计 token 用量（仅在最后一个 chunk 出现）
    usage: dict | None = None


class BaseProvider(abc.ABC):
    """所有 provider 的基类。"""

    name: str = "base"
    display_name: str = "Base"
    domains: list[str] = []
    supports_expert_mode: bool = False
    expert_mode_label: str = "专家模式"

    def __init__(self, cookie_record: dict | None) -> None:
        self.cookie_record = cookie_record or {}

    @abc.abstractmethod
    async def chat(self, request: ChatRequest) -> AsyncIterator[ChatChunk]:
        """流式返回。子类必须实现。"""
        if False:
            yield  # 让类型检查器满意
        raise NotImplementedError

    @abc.abstractmethod
    async def validate(self) -> bool:
        """用当前 cookie 调一个轻量接口，确认 session 有效。"""
        raise NotImplementedError

    # ---------- 工具方法 ----------

    def cookie_header(self) -> str:
        """把所有 cookies 拼成 Cookie header 字符串。"""
        cookies = self.cookie_record.get("cookies", [])
        return "; ".join(
            f"{c['name']}={c['value']}"
            for c in cookies
            if c.get("name") and c.get("value") is not None
        )

    def auth_header(self) -> str | None:
        """某些平台需要 Authorization header。"""
        headers = self.cookie_record.get("headers", {}) or {}
        return headers.get("Authorization") or headers.get("authorization")
