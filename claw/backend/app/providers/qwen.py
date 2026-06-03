"""Qwen3.7-Max 适配器（端到端实现）。

**实现策略**（基于社区逆向 + OpenClaw Zero Token 思路）：
1. Web chat 私有端点：`https://chat.qwen.ai/api/chat/completions`
   国内版： `https://qianwen.com/api/...` 或 `https://tongyi.aliyun.com/api/...`
2. 鉴权：Cookie 里的 `acw_tc` 和 `login_ticket` 等；Qwen 端**没有** Bearer token，纯靠 cookie
3. 协议：兼容 OpenAI 格式，但 SSE chunk 里有 `web_search` 字段时表示走了搜索
4. 思考模式：请求体加 `enable_thinking=True` 和 `thinking_budget`（DashScope 公开 API 同样支持）
5. 工具调用：DashScope 有原生 `tools` 字段（OpenAI 兼容），网页端**有限支持**，通常只能触发 `web_search` 内置工具
"""
from __future__ import annotations

import json
import time
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

    # 私有端点
    WEB_CHAT_URL = "https://chat.qwen.ai/api/chat/completions"
    # 公开 API（OpenAI 兼容）
    OFFICIAL_API_URL_INTL = (
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
    )
    OFFICIAL_API_URL_CN = (
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    )
    # 健康检查
    USER_INFO_URL = "https://chat.qwen.ai/api/user/info"

    def _base_url(self) -> str:
        if self.auth_header():
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
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Content-Type": "application/json",
            "x-request-id": f"claw-{int(time.time() * 1000)}",
        }
        is_web = self._base_url() == self.WEB_CHAT_URL
        if is_web:
            headers["Origin"] = "https://chat.qwen.ai"
            headers["Referer"] = "https://chat.qwen.ai/"
            headers["x-platform"] = "qwen_web"
        else:
            headers["Origin"] = "https://dashscope-intl.aliyuncs.com"

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
            body["enable_thinking"] = True
            body["thinking_budget"] = 81920
        else:
            body["enable_thinking"] = False
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

    def _inject_tool_system_prompt(self, messages: list[ChatMessage]) -> list[ChatMessage]:
        if not any(m.role == "system" for m in messages):
            system_prompt = (
                "你可以使用以下工具。用 <tool_call>{\"name\": \"...\", \"arguments\": {...}}</tool_call> 输出工具调用。\n"
                "- exec(command, timeout?): shell\n"
                "- read_file(path, max_lines?): 读文件\n"
                "- write_file(path, content): 写文件\n"
                "- list_dir(path?): 列目录\n"
                "- web_search(query, max_results?): 搜索\n"
            )
            messages = [ChatMessage(role="system", content=system_prompt)] + messages
        return messages

    async def chat(self, request: ChatRequest) -> AsyncIterator[ChatChunk]:
        if not self.cookie_record:
            yield ChatChunk(
                error="Qwen 未配置 Cookie。请先在设置页登录并抓取。",
                finish_reason="error",
            )
            return

        if request.tools and not any(m.role == "system" for m in request.messages):
            request = ChatRequest(
                messages=self._inject_tool_system_prompt(request.messages),
                model=request.model,
                expert_mode=request.expert_mode,
                stream=request.stream,
                tools=request.tools,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )

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
                                error=self._format_error(resp.status_code, text),
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
                            error=self._format_error(resp.status_code, resp.content),
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

    @staticmethod
    def _format_error(status: int, body: bytes) -> str:
        try:
            text = body.decode("utf-8", errors="replace")[:500]
        except Exception:  # noqa: BLE001
            text = "<unreadable>"
        try:
            obj = json.loads(text)
            if isinstance(obj, dict):
                msg = (
                    obj.get("error", {}).get("message")
                    or obj.get("message")
                    or text
                )
                return f"Qwen 返回 {status}: {msg}"
        except json.JSONDecodeError:
            pass
        return f"Qwen 返回 {status}: {text}"

    async def validate(self) -> bool:
        if not self.cookie_record:
            return False
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(self.USER_INFO_URL, headers=self._build_headers())
                return resp.status_code == 200
        except Exception as exc:  # noqa: BLE001
            logger.debug(f"Qwen validate error: {exc}")
            return False
