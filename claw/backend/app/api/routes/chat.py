"""聊天路由：HTTP 流式（SSE）和 WebSocket 双协议。"""
from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel

from app.providers import get_provider
from app.providers.base import (
    ChatMessage,
    ChatRequest,
    ChatChunk,
    ToolSpec,
)
from app.schemas import ChatRequest as ChatRequestSchema
from app.tools.builtin import get_tool_registry, tool_specs

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


@router.post("/completions")
async def chat_completions(payload: ChatRequestSchema) -> StreamingResponse:
    """OpenAI 兼容的流式聊天端点。"""
    provider = get_provider(payload.provider)
    if provider is None:
        raise HTTPException(404, f"Unknown provider: {payload.provider}")
    request = _build_chat_request(payload)

    async def event_source() -> AsyncIterator[bytes]:
        tool_ctx = None
        registry = get_tool_registry(__import__("app.tools.builtin", fromlist=["ToolContext"]).ToolContext())
        try:
            async for chunk in provider.chat(request):
                # 处理工具调用
                if chunk.tool_call:
                    name = chunk.tool_call.get("function", {}).get("name")
                    args_raw = chunk.tool_call.get("function", {}).get("arguments", "{}")
                    try:
                        args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
                    except json.JSONDecodeError:
                        args = {}
                    if name in registry:
                        try:
                            result = await registry[name].run(**args)
                        except Exception as exc:  # noqa: BLE001
                            result = f"[tool error] {exc}"
                        yield f"data: {json.dumps({'tool_result': {'name': name, 'result': result}}, ensure_ascii=False)}\n\n".encode()
                yield f"data: {json.dumps(_serialize_chunk(chunk), ensure_ascii=False)}\n\n".encode()
                if chunk.finish_reason or chunk.error:
                    break
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
