import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services import deepseek_service, qwen_service
from app.services.tool_executor import execute_tool, parse_tool_calls_from_text

router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[list] = None
    model: str = "deepseek-chat"
    platform: Optional[str] = None
    chat_session_id: Optional[str] = None
    chatSessionId: Optional[str] = None
    parent_message_id: Optional[str] = None
    parentMessageId: Optional[str] = None
    thinking_enabled: bool = True
    search_enabled: bool = False
    enableSearch: bool = False
    enableThinking: bool = False
    enable_thinking: bool = False
    thinking_budget: int = 10000
    chat_history: Optional[list] = None
    max_tool_rounds: int = 5
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None
    topP: Optional[float] = None


def _get_platform(model: str, platform: Optional[str] = None) -> str:
    if platform in ("deepseek", "qwen"):
        return platform
    if model.startswith("deepseek"):
        return "deepseek"
    elif model.startswith("qwen"):
        return "qwen"
    return "deepseek"


def _extract_message(request: ChatRequest) -> str:
    if request.message:
        return request.message
    if request.messages:
        last_msg = request.messages[-1] if request.messages else None
        if isinstance(last_msg, dict):
            return last_msg.get("content", "")
        if isinstance(last_msg, str):
            return last_msg
    return ""


def _extract_chat_history(request: ChatRequest) -> Optional[list]:
    if request.chat_history:
        return request.chat_history
    if request.messages and len(request.messages) > 1:
        return request.messages[:-1]
    return None


async def _stream_chat(request: ChatRequest):
    try:
        async for chunk in _stream_chat_inner(request):
            yield chunk
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'content': ''}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"


async def _stream_chat_inner(request: ChatRequest):
    platform = _get_platform(request.model, request.platform)
    user_message = _extract_message(request)
    chat_history = _extract_chat_history(request)
    chat_session_id = request.chat_session_id or request.chatSessionId
    parent_message_id = request.parent_message_id or request.parentMessageId

    if not user_message:
        yield f"data: {json.dumps({'type': 'error', 'content': '消息不能为空'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'content': ''}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"
        return

    search_on = request.search_enabled or request.enableSearch
    thinking_on = request.thinking_enabled or request.enableThinking or request.enable_thinking

    tool_round = 0
    accumulated_content = ""

    while tool_round <= request.max_tool_rounds:
        if platform == "deepseek":
            stream = deepseek_service.chat_stream(
                message=user_message if tool_round == 0 else accumulated_content,
                model=request.model,
                chat_session_id=chat_session_id,
                parent_message_id=parent_message_id,
                thinking_enabled=thinking_on,
                search_enabled=search_on,
            )
        else:
            stream = qwen_service.chat_stream(
                message=user_message if tool_round == 0 else accumulated_content,
                model=request.model,
                chat_history=chat_history,
                enable_thinking=thinking_on,
                thinking_budget=request.thinking_budget,
                search_enabled=search_on,
            )

        tool_calls_found = []
        current_content = ""
        has_tool_call = False

        async for event in stream:
            event_type = event.get("type", "")
            event_content = event.get("content", "")

            if event_type == "session_info":
                try:
                    info = json.loads(event_content) if event_content else {}
                    if info.get("chat_session_id"):
                        chat_session_id = info["chat_session_id"]
                    if info.get("parent_message_id"):
                        parent_message_id = info["parent_message_id"]
                except json.JSONDecodeError:
                    pass
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            elif event_type == "tool_call":
                has_tool_call = True
                try:
                    tool_data = json.loads(event_content)
                    tool_calls_found.append(tool_data)
                except json.JSONDecodeError:
                    tool_calls_found.append({"raw": event_content})
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            elif event_type == "done":
                pass
            else:
                if event_type == "content":
                    current_content += event_content
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        if not has_tool_call:
            break

        tool_round += 1
        accumulated_content = current_content

        for tool_call in tool_calls_found:
            tool_name = tool_call.get("name", "")
            tool_args = tool_call.get("arguments", {})

            if isinstance(tool_args, str):
                try:
                    tool_args = json.loads(tool_args)
                except json.JSONDecodeError:
                    tool_args = {"raw": tool_args}

            tool_result = await execute_tool(tool_name, tool_args)

            result_event = {
                "type": "tool_result",
                "content": tool_result,
                "tool_name": tool_name,
                "tool_call_id": tool_call.get("id", ""),
            }
            yield f"data: {json.dumps(result_event, ensure_ascii=False)}\n\n"

            accumulated_content += f"\n\n工具 {tool_name} 的执行结果:\n{tool_result}"

        if not tool_calls_found:
            text_tool_calls = parse_tool_calls_from_text(current_content)
            if text_tool_calls:
                has_tool_call = True
                for tc in text_tool_calls:
                    tc_name = tc.get("name", "")
                    tc_args = tc.get("arguments", {})
                    if isinstance(tc_args, str):
                        try:
                            tc_args = json.loads(tc_args)
                        except json.JSONDecodeError:
                            tc_args = {"raw": tc_args}

                    tc_result = await execute_tool(tc_name, tc_args)
                    result_event = {
                        "type": "tool_result",
                        "content": tc_result,
                        "tool_name": tc_name,
                    }
                    yield f"data: {json.dumps(result_event, ensure_ascii=False)}\n\n"
                    accumulated_content += f"\n\n工具 {tc_name} 的执行结果:\n{tc_result}"

    yield f"data: {json.dumps({'type': 'done', 'content': ''}, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(
        _stream_chat(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
