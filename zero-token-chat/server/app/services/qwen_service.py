import json
from typing import AsyncGenerator, Optional

import httpx

from app.config import QWEN_BASE_URL, QWEN_CHAT_ENDPOINT
from app.services.credential_store import load_credential

MODEL_MAP = {
    "qwen3-max": "qwen3-max",
    "qwen3-235b-a22b": "qwen3-235b-a22b",
    "qwen-plus": "qwen-plus",
    "qwen-turbo": "qwen-turbo",
}

THINKING_MODELS = {"qwen3-max", "qwen3-235b-a22b"}


def _get_auth_headers(token: str) -> dict:
    return {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "Authorization": f"Bearer {token}",
    }


def _build_payload(
    message: str,
    model: str = "qwen3-max",
    chat_history: Optional[list] = None,
    enable_thinking: bool = False,
    thinking_budget: int = 10000,
    stream: bool = True,
) -> dict:
    messages = []
    if chat_history:
        messages.extend(chat_history)
    messages.append({"role": "user", "content": message})

    payload = {
        "model": MODEL_MAP.get(model, model),
        "messages": messages,
        "stream": stream,
    }

    if enable_thinking and model in THINKING_MODELS:
        payload["extra_body"] = {
            "enable_thinking": True,
            "thinking_budget": thinking_budget,
        }
        payload["enable_thinking"] = True
        payload["thinking_budget"] = thinking_budget

    return payload


async def chat_stream(
    message: str,
    model: str = "qwen3-max",
    chat_history: Optional[list] = None,
    enable_thinking: bool = False,
    thinking_budget: int = 10000,
) -> AsyncGenerator[dict, None]:
    cred = load_credential("qwen")
    if not cred or not cred.get("token"):
        yield {"type": "error", "content": "Qwen 凭证未配置，请先登录或手动导入 token"}
        return

    token = cred["token"]
    headers = _get_auth_headers(token)
    payload = _build_payload(message, model, chat_history, enable_thinking, thinking_budget)

    async with httpx.AsyncClient(base_url=QWEN_BASE_URL, timeout=120) as client:
        try:
            async with client.stream("POST", QWEN_CHAT_ENDPOINT, headers=headers, json=payload) as resp:
                if resp.status_code == 401:
                    yield {"type": "error", "content": "Qwen 认证失败，token 可能已过期"}
                    return

                if resp.status_code == 429:
                    yield {"type": "error", "content": "Qwen 请求频率过高，请稍后重试"}
                    return

                if resp.status_code != 200:
                    body = await resp.aread()
                    yield {"type": "error", "content": f"Qwen 请求失败: {resp.status_code} {body.decode(errors='ignore')}"}
                    return

                async for line in resp.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue

                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                        if data_str == "[DONE]":
                            yield {"type": "done", "content": ""}
                            return

                        try:
                            data = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        choices = data.get("choices", [])
                        if not choices:
                            continue

                        for choice in choices:
                            delta = choice.get("delta", {})
                            finish_reason = choice.get("finish_reason")

                            if finish_reason == "stop":
                                yield {"type": "done", "content": ""}
                                return

                            if delta.get("reasoning_content"):
                                yield {"type": "thinking", "content": delta["reasoning_content"]}

                            if delta.get("content"):
                                yield {"type": "content", "content": delta["content"]}

                            if delta.get("tool_calls"):
                                for tc in delta["tool_calls"]:
                                    func = tc.get("function", {})
                                    yield {
                                        "type": "tool_call",
                                        "content": json.dumps({
                                            "id": tc.get("id", ""),
                                            "name": func.get("name", ""),
                                            "arguments": func.get("arguments", ""),
                                        }),
                                    }

                        usage = data.get("usage")
                        if usage:
                            pass

        except httpx.TimeoutException:
            yield {"type": "error", "content": "Qwen 请求超时"}
        except httpx.ConnectError:
            yield {"type": "error", "content": "无法连接 Qwen 服务器"}
        except Exception as e:
            yield {"type": "error", "content": f"Qwen 服务异常: {str(e)}"}
