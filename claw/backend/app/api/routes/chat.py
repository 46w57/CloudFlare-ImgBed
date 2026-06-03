"""聊天路由：HTTP 流式（SSE）和 WebSocket 双协议。

工具调用处理：
- Provider 输出的原生 `tool_calls` 字段（OpenAI 格式）→ 后端解析后执行 → 把 tool result 作为 `tool` role 消息塞回上下文，让模型继续。
- 同时也支持模型用 XML 风格 `<tool_call>{...}</tool_call>` 输出（很多私有端点会这样），通过 `parse_legacy_tool_calls` 解析。
"""
from __future__ import annotations

import asyncio
import json
import re
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger

from app.providers import get_provider
from app.providers.base import (
    ChatMessage,
    ChatRequest,
    ChatChunk,
    ToolSpec,
)
from app.schemas import ChatRequest as ChatRequestSchema
from app.tools.builtin import ToolContext, get_tool_registry, tool_specs

router = APIRouter(prefix="/chat", tags=["chat"])


def _build_chat_request(payload: ChatRequestSchema) -> ChatRequest:
    tools: list[ToolSpec] = []
    if payload.enable_tools:
        tools = tool_specs()
    return ChatRequest(
        messages=[ChatMessage(**m.model_dump()) for m in payload.messages],
        model=payload.model or "",
        expert_mode=payload.expert_mode,
        stream=payload.stream,
        tools=tools,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
    )


def _serialize_chunk(chunk: ChatChunk) -> dict:
    return {
        "delta": chunk.delta,
        "is_thinking": chunk.is_thinking,
        "tool_call": chunk.tool_call,
        "finish_reason": chunk.finish_reason,
        "error": chunk.error,
        "usage": chunk.usage,
    }


# 兼容 XML 风格 <tool_call>{...}</tool_call>
LEGACY_TOOL_CALL_RE = re.compile(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", re.DOTALL)


def parse_legacy_tool_calls(content: str) -> list[dict]:
    """从模型文本里抽 <tool_call>{...}</tool_call> 块，返回工具调用列表。"""
    out: list[dict] = []
    for m in LEGACY_TOOL_CALL_RE.finditer(content):
        try:
            data = json.loads(m.group(1))
            name = data.get("name")
            args = data.get("arguments", {}) or {}
            if name:
                out.append(
                    {
                        "id": f"call_{len(out)}_{hash(name) & 0xffff:04x}",
                        "type": "function",
                        "function": {
                            "name": name,
                            "arguments": json.dumps(args, ensure_ascii=False),
                        },
                    }
                )
        except json.JSONDecodeError:
            continue
    return out


def _strip_tool_calls(content: str) -> str:
    """把文本中的 <tool_call> 块去掉，只留可读部分。"""
    return LEGACY_TOOL_CALL_RE.sub("", content).strip()


async def _execute_tool_call(call: dict, registry: dict) -> dict:
    name = call.get("function", {}).get("name")
    args_raw = call.get("function", {}).get("arguments", "{}")
    try:
        args = json.loads(args_raw) if isinstance(args_raw, str) else (args_raw or {})
    except json.JSONDecodeError:
        args = {}
    if name not in registry:
        return {"name": name, "result": f"未知工具: {name}"}
    try:
        result = await registry[name].run(**args)
    except Exception as exc:  # noqa: BLE001
        result = f"[tool error] {exc}"
    return {"name": name, "result": str(result)[:8000]}


@router.post("/completions")
async def chat_completions(payload: ChatRequestSchema) -> StreamingResponse:
    """OpenAI 兼容的流式聊天端点。

    工具调用循环：
    1. 调 provider 拿流（最多 8 轮工具循环，避免无限循环）
    2. 如果收到 `tool_call`，执行工具，把结果作为 `tool` 角色消息追加到 messages，重发请求
    3. 整个过程通过 SSE 推给前端
    """
    provider = get_provider(payload.provider)
    if provider is None:
        raise HTTPException(404, f"Unknown provider: {payload.provider}")
    request = _build_chat_request(payload)
    registry = get_tool_registry(ToolContext())

    async def event_source() -> AsyncIterator[bytes]:
        try:
            # 工具调用循环
            current_messages = list(request.messages)
            for round_idx in range(8):
                req_iter = ChatRequest(
                    messages=current_messages,
                    model=request.model,
                    expert_mode=request.expert_mode,
                    stream=True,
                    tools=request.tools,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                )
                round_text = ""
                collected_tool_calls: list[dict] = []
                errored = False
                finish_reason = None
                async for chunk in provider.chat(req_iter):
                    if chunk.error:
                        yield f"data: {json.dumps(_serialize_chunk(chunk), ensure_ascii=False)}\n\n".encode()
                        errored = True
                        break
                    if chunk.tool_call:
                        # 合并 delta 形式的 tool call
                        tc = chunk.tool_call
                        if not collected_tool_calls:
                            collected_tool_calls.append(tc)
                        else:
                            last = collected_tool_calls[-1]
                            if last.get("id") and tc.get("id") and last["id"] != tc["id"]:
                                collected_tool_calls.append(tc)
                            else:
                                # 累积 arguments
                                last_fn = last.get("function", {})
                                new_fn = tc.get("function", {})
                                last_fn["arguments"] = (
                                    last_fn.get("arguments", "") + new_fn.get("arguments", "")
                                )
                                last_fn["name"] = last_fn.get("name") or new_fn.get("name")
                    if chunk.delta:
                        round_text += chunk.delta
                    finish_reason = chunk.finish_reason or finish_reason
                    yield f"data: {json.dumps(_serialize_chunk(chunk), ensure_ascii=False)}\n\n".encode()
                if errored:
                    break

                # 兜底：检查 XML 风格 <tool_call>
                if not collected_tool_calls and round_text:
                    legacy = parse_legacy_tool_calls(round_text)
                    if legacy:
                        collected_tool_calls = legacy
                        # 推一个 stripped 版本
                        clean = _strip_tool_calls(round_text)
                        if clean:
                            yield f"data: {json.dumps({'delta': clean, 'is_thinking': False}, ensure_ascii=False)}\n\n".encode()

                if not collected_tool_calls:
                    # 正常结束
                    break

                # 把 assistant 工具调用请求追加进 messages
                tool_calls_serialized = [
                    {
                        "id": tc.get("id", f"call_{i}"),
                        "type": "function",
                        "function": {
                            "name": tc.get("function", {}).get("name"),
                            "arguments": tc.get("function", {}).get("arguments", "{}"),
                        },
                    }
                    for i, tc in enumerate(collected_tool_calls)
                ]
                current_messages.append(
                    ChatMessage(
                        role="assistant",
                        content=_strip_tool_calls(round_text),
                        tool_calls=tool_calls_serialized,
                    )
                )
                # 执行工具
                for call in collected_tool_calls:
                    result = await _execute_tool_call(call, registry)
                    yield f"data: {json.dumps({'tool_result': result}, ensure_ascii=False)}\n\n".encode()
                    current_messages.append(
                        ChatMessage(
                            role="tool",
                            content=result["result"],
                            name=result["name"],
                            tool_call_id=call.get("id"),
                        )
                    )
                # 继续下一轮
            yield b"data: [DONE]\n\n"
        except asyncio.CancelledError:
            logger.info("client disconnected")
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("chat error")
            err_chunk = _serialize_chunk(
                ChatChunk(error=str(exc), finish_reason="error")
            )
            yield f"data: {json.dumps(err_chunk, ensure_ascii=False)}\n\n".encode()
            yield b"data: [DONE]\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/test")
async def chat_test(payload: ChatRequestSchema) -> dict:
    """非流式测试。"""
    provider = get_provider(payload.provider)
    if provider is None:
        raise HTTPException(404, f"Unknown provider: {payload.provider}")
    request = _build_chat_request(payload)
    request.stream = False
    full_text = ""
    error = None
    async for chunk in provider.chat(request):
        if chunk.error:
            error = chunk.error
            break
        full_text += chunk.delta
    return {"ok": error is None, "text": full_text, "error": error}
