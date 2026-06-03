"""Qwen3.7-Max 适配器。

类似 DeepSeek，端点占位。Qwen 官网 chat 走的私有域是 `chat.qwen.ai`。
国内版额外有 `qianwen.com`，适配器会按 cookie 域名自动选择。

公开 API（Alibaba DashScope）也支持 Qwen3.7-Max，OpenAI 兼容：
    https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
    https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
    鉴权：Bearer sk-xxx
"""
from __future__ import annotations

import json
from typing import AsyncIterator

import httpx
from loguru import logger

from app.core.config import get_settings
from app.providers.base import (
    BaseProvider,
    ChatChunk,
    ChatMessage,
    ChatRequest,
    ToolSpec,
)


class QwenProvider(BaseProvider):
    name = "qwen"
    display_name = "Qwen3.7 Max"
    domains = [
        "chat.qwen.ai",
        "qianwen.com",
        "tongyi.aliyun.com",
        ".qwen.ai",
        ".aliyun.com",
    ]
    supports_expert_mode = True
    expert_mode_label = "思考模式 (Extended-Thinking)"

    # 私有端点 - 抓包后请按实际微调
    WEB_CHAT_URL = "https://chat.qwen.ai/api/chat/completions"
    # DashScope 公开 API（OpenAI 兼容）
    OFFICIAL_API_URL_INTL = (
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
    )
    OFFICIAL_API_URL_CN = (
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    )

    def _base_url(self) -> str:
        """根据 cookie 域名 / Authorization header 自动选择端点。"""
        if self.auth_header():
            # 看 cookie 决定走国际版还是国内版
            domain_set = {c.get("domain", "") for c in self.cookie_record.get("cookies", [])}
            if any("aliyun.com" in d and "intl" not in d for d in domain_set):
                return self.OFFICIAL_API_URL_CN
            return self.OFFICIAL_API_URL_INTL
        return self.WEB_CHAT_URL

    def _build_headers(self) -> dict[str, str]:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/130.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Content-Type": "application/json",
            "Origin": "https://chat.qwen.ai",
            "Referer": "https://chat.qwen.ai/",
        }
        cookie = self.cookie_header()
        if cookie:
            headers["Cookie"] = cookie
        if self.auth_header():
            headers["Authorization"] = self.auth_header()
        return headers

    def _build_request_body(self, request: ChatRequest) -> dict:
        is_web = self._base_url() == self.WEB_CHAT_URL
        body: dict = {
            "model": request.model or "qwen3.7-max",
            "messages": [self._serialize_message(m) for m in request.messages],
            "stream": request.stream,
        }
        if request.temperature is not None:
            body["temperature"] = request.temperature
        if request.max_tokens is not None:
            body["max_tokens"] = request.max_tokens
        if request.tools:
            body["tools"] = [self._serialize_tool(t) for t in request.tools]
            body["tool_choice"] = "auto"

        if request.expert_mode:
            if is_web:
                # 网页端点：通过 enable_thinking 字段触发
                body["enable_thinking"] = True
                body["thinking_budget"] = 81920
            else:
                # 官方 API：DashScope 用 extra_body 传递
                body["enable_thinking"] = True
                body["thinking_budget"] = 81920
        return body

    def _serialize_message(self, m: ChatMessage) -> dict:
        out = {"role": m.role, "content": m.content}
        if m.name:
            out["name"] = m.name
        if m.tool_call_id:
            out["tool_call_id"] = m.tool_call_id
        if m.tool_calls:
            out["tool_calls"] = m.tool_calls
        return out

    def _serialize_tool(self, t: ToolSpec) -> dict:
        return {
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters,
            },
        }

    async def chat(self, request: ChatRequest) -> AsyncIterator[ChatChunk]:
        if not self.cookie_record:
            yield ChatChunk(
                error="Qwen 未配置 Cookie。请先在设置页登录并抓取。",
                finish_reason="error",
            )
            return

        url = self._base_url()
        headers = self._build_headers()
        body = self._build_request_body(request)
        settings = get_settings()

        logger.info(
            f"[qwen] POST {url} model={body['model']} thinking={request.expert_mode}"
        )

        try:
            async with httpx.AsyncClient(
                timeout=settings.request_timeout, follow_redirects=True
            ) as client:
                if request.stream:
                    async with client.stream(
                        "POST", url, headers=headers, json=body
                    ) as resp:
                        if resp.status_code != 200:
                            text = await resp.aread()
                            yield ChatChunk(
                                error=(
                                    f"Qwen 返回 {resp.status_code}: "
                                    f"{text[:500].decode('utf-8', errors='replace')}"
                                ),
                                finish_reason="error",
                            )
                            return
                        async for line in resp.aiter_lines():
                            chunk = self._parse_sse_line(line)
                            if chunk:
                                yield chunk
                else:
                    resp = await client.post(url, headers=headers, json=body)
                    if resp.status_code != 200:
                        yield ChatChunk(
                            error=f"Qwen 返回 {resp.status_code}: {resp.text[:500]}",
                            finish_reason="error",
                        )
                        return
                    data = resp.json()
                    yield ChatChunk(
                        delta=data.get("choices", [{}])[0]
                        .get("message", {})
                        .get("content", ""),
                        finish_reason=data.get("choices", [{}])[0].get("finish_reason"),
                    )
        except httpx.TimeoutException:
            yield ChatChunk(error="Qwen 请求超时", finish_reason="error")
        except Exception as exc:  # noqa: BLE001
            logger.exception("Qwen chat error")
            yield ChatChunk(error=f"Qwen 调用失败: {exc}", finish_reason="error")

    def _parse_sse_line(self, line: str) -> ChatChunk | None:
        if not line or line.startswith(":"):
            return None
        if line.startswith("data:"):
            data = line[len("data:") :].strip()
        else:
            data = line.strip()
        if not data or data == "[DONE]":
            return ChatChunk(finish_reason="stop") if data == "[DONE]" else None
        try:
            obj = json.loads(data)
        except json.JSONDecodeError:
            return None

        choice = (obj.get("choices") or [{}])[0]
        delta = choice.get("delta") or {}
        # 思考内容
        reasoning = delta.get("reasoning_content") or ""
        text = delta.get("content") or ""
        is_thinking = bool(reasoning) and not text
        if is_thinking:
            text = reasoning

        chunk = ChatChunk(
            delta=text,
            is_thinking=is_thinking,
            finish_reason=choice.get("finish_reason"),
        )
        if delta.get("tool_calls"):
            chunk.tool_call = delta["tool_calls"][0]
        if obj.get("usage"):
            chunk.usage = obj["usage"]
        return chunk

    async def validate(self) -> bool:
        """用 cookie 访问一个轻量接口。"""
        if not self.cookie_record:
            return False
        url = "https://chat.qwen.ai/api/user/info"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=self._build_headers())
                return resp.status_code == 200
        except Exception as exc:  # noqa: BLE001
            logger.debug(f"Qwen validate error: {exc}")
            return False
