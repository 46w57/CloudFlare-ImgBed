"""DeepSeek V4 Pro 适配器。

⚠️ 端点占位说明
=================
下面的 URL / Headers 是基于 DeepSeek 公开 API 文档 + 社区分析整理的"最可能"形态。
DeepSeek 网页 chat 后面的私有端点（`/api/v0/chat/completions` 等）会随版本调整，符号、
签名、压缩都可能变化。第一次跑通后请按 README 步骤在浏览器抓包确认。

实现策略：
1. 默认走"已登录网页"的私有端点。模型字段填 `deepseek-v4-pro`，
   并在请求体里加 `chat_mode: "expert"` 触发专家模式（页面切换后 Network 里能看到）。
2. 同时支持走**官方公开 API** `https://api.deepseek.com/v1/chat/completions`，
   这个是稳定的 OpenAI 兼容端点。只需要 cookie 里带 Bearer token。
3. 真实请求格式在 `_build_request` 里拼装，可被 `tests/` 下的单测覆盖。
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


class DeepSeekProvider(BaseProvider):
    name = "deepseek"
    display_name = "DeepSeek V4 Pro"
    domains = ["chat.deepseek.com", ".deepseek.com"]
    supports_expert_mode = True
    expert_mode_label = "专家模式 (Think Max)"

    # 私有端点（网页 chat 后端）。如失效请用浏览器抓包覆盖。
    WEB_CHAT_URL = "https://chat.deepseek.com/api/v0/chat/completions"
    # 官方公开 API（OpenAI 兼容）
    OFFICIAL_API_URL = "https://api.deepseek.com/v1/chat/completions"

    def _base_url(self) -> str:
        """根据 cookie 携带的信息自动选择端点。

        如果 cookie 里没有 Bearer token 但有 `chat.deepseek.com` 域 cookie → 走 WEB_CHAT_URL。
        否则（说明用户用 API key 形式登录）→ 走 OFFICIAL_API_URL。
        """
        if self.auth_header():
            return self.OFFICIAL_API_URL
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
            "Origin": "https://chat.deepseek.com",
            "Referer": "https://chat.deepseek.com/",
        }
        cookie = self.cookie_header()
        if cookie:
            headers["Cookie"] = cookie
        if self.auth_header():
            headers["Authorization"] = self.auth_header()
        return headers

    def _build_request_body(self, request: ChatRequest) -> dict:
        """构造请求体。

        关键字段：
        - model: 官方 API 是 `deepseek-v4-pro`；网页私有端点用同一个字符串即可
        - chat_mode: 私有端点要带 "expert" 触发专家模式
        - thinking: 官方 API 控制是否启用思考
        """
        is_web = self._base_url() == self.WEB_CHAT_URL
        body: dict = {
            "model": request.model or "deepseek-v4-pro",
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
                # 网页端点：chat_mode 字段
                body["chat_mode"] = "expert"
            else:
                # 官方 API：thinking 控制
                body["thinking"] = {"type": "enabled", "budget": "max"}

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
                error="DeepSeek 未配置 Cookie。请先在设置页登录并抓取。",
                finish_reason="error",
            )
            return

        url = self._base_url()
        headers = self._build_headers()
        body = self._build_request_body(request)
        settings = get_settings()

        logger.info(
            f"[deepseek] POST {url} model={body['model']} expert={request.expert_mode}"
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
                                    f"DeepSeek 返回 {resp.status_code}: "
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
                            error=f"DeepSeek 返回 {resp.status_code}: {resp.text[:500]}",
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
            yield ChatChunk(error="DeepSeek 请求超时", finish_reason="error")
        except Exception as exc:  # noqa: BLE001
            logger.exception("DeepSeek chat error")
            yield ChatChunk(error=f"DeepSeek 调用失败: {exc}", finish_reason="error")

    def _parse_sse_line(self, line: str) -> ChatChunk | None:
        """解析一行 SSE。返回 None 表示这一行无需处理。"""
        if not line:
            return None
        if line.startswith(":"):
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

        # OpenAI 兼容格式
        choice = (obj.get("choices") or [{}])[0]
        delta = choice.get("delta") or {}
        text = delta.get("content") or ""
        is_thinking = bool(delta.get("reasoning_content")) and not text
        if not is_thinking and delta.get("reasoning_content"):
            # 思考内容优先走 is_thinking 分支
            text = delta["reasoning_content"]
            is_thinking = True

        chunk = ChatChunk(
            delta=text,
            is_thinking=is_thinking,
            finish_reason=choice.get("finish_reason"),
        )
        # 工具调用
        if delta.get("tool_calls"):
            chunk.tool_call = delta["tool_calls"][0]
        # 用量
        if obj.get("usage"):
            chunk.usage = obj["usage"]
        return chunk

    async def validate(self) -> bool:
        """用 cookie 访问一个轻量接口。"""
        if not self.cookie_record:
            return False
        url = "https://chat.deepseek.com/api/v0/user/info"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=self._build_headers())
                return resp.status_code == 200
        except Exception as exc:  # noqa: BLE001
            logger.debug(f"DeepSeek validate error: {exc}")
            return False
