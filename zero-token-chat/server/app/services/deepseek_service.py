import json
import uuid
from typing import AsyncGenerator, Optional

import httpx

from app.config import DEEPSEEK_BASE_URL, DEEPSEEK_CHAT_ENDPOINT, DEEPSEEK_CREATE_ENDPOINT
from app.services.credential_store import load_credential


def _get_auth_headers(token: str, cookies: str) -> dict:
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "Authorization": f"Bearer {token}",
    }
    if cookies:
        headers["Cookie"] = cookies
    return headers


async def _create_chat_session(token: str, cookies: str, model: str = "deepseek-chat") -> Optional[str]:
    headers = _get_auth_headers(token, cookies)
    payload = {}
    if model:
        payload["model"] = model

    async with httpx.AsyncClient(base_url=DEEPSEEK_BASE_URL, timeout=30) as client:
        try:
            resp = await client.post(DEEPSEEK_CREATE_ENDPOINT, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", {}).get("chat_session_id") or data.get("chat_session_id")
            return None
        except Exception:
            return None


async def _solve_pow(challenge: dict) -> str:
    import hashlib

    algorithm = challenge.get("algorithm", "sha256")
    difficulty = challenge.get("difficulty", 0)
    salt = challenge.get("salt", "")

    nonce = 0
    while True:
        raw = f"{salt}{nonce}"
        if algorithm == "sha256":
            h = hashlib.sha256(raw.encode()).hexdigest()
        else:
            h = hashlib.md5(raw.encode()).hexdigest()
        if h[:difficulty] == "0" * difficulty:
            return str(nonce)
        nonce += 1
        if nonce > 1_000_000:
            return "0"


async def _retry_with_pow(client: httpx.AsyncClient, headers: dict, payload: dict) -> AsyncGenerator[dict, None]:
    try:
        async with client.stream("POST", DEEPSEEK_CHAT_ENDPOINT, headers=headers, json=payload) as resp:
            if resp.status_code != 200:
                body = await resp.aread()
                yield {"type": "error", "content": f"DeepSeek PoW 重试失败: {resp.status_code}"}
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
                        msg_type = data.get("type", "")
                        if msg_type == "thinking":
                            thinking_content = data.get("content", data.get("data", {}).get("content", ""))
                            if thinking_content:
                                yield {"type": "thinking", "content": thinking_content}
                        elif msg_type == "search":
                            search_content = data.get("content", data.get("data", {}).get("content", ""))
                            if search_content:
                                yield {"type": "search", "content": search_content}
                        elif msg_type == "tool_call":
                            tool_data = data.get("data", data.get("content", ""))
                            yield {"type": "tool_call", "content": json.dumps(tool_data) if isinstance(tool_data, dict) else str(tool_data)}
                        elif msg_type == "tool_result":
                            tool_result = data.get("data", data.get("content", ""))
                            yield {"type": "tool_result", "content": json.dumps(tool_result) if isinstance(tool_result, dict) else str(tool_result)}
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
                        if delta.get("search_info"):
                            yield {"type": "search", "content": json.dumps(delta["search_info"])}
    except Exception as e:
        yield {"type": "error", "content": f"DeepSeek PoW 重试异常: {str(e)}"}


async def chat_stream(
    message: str,
    model: str = "deepseek-chat",
    chat_session_id: Optional[str] = None,
    parent_message_id: Optional[str] = None,
    thinking_enabled: bool = True,
    search_enabled: bool = False,
) -> AsyncGenerator[dict, None]:
    cred = load_credential("deepseek")
    if not cred or not cred.get("token"):
        yield {"type": "error", "content": "DeepSeek 凭证未配置，请先登录或手动导入 token"}
        return

    token = cred["token"]
    cookies = cred.get("cookies", "")

    if not chat_session_id:
        chat_session_id = await _create_chat_session(token, cookies, model)
        if not chat_session_id:
            yield {"type": "error", "content": "无法创建 DeepSeek 会话，请检查凭证是否有效"}
            return

    if not parent_message_id:
        parent_message_id = str(uuid.uuid4())

    yield {"type": "session_info", "content": json.dumps({"chat_session_id": chat_session_id, "parent_message_id": parent_message_id})}

    headers = _get_auth_headers(token, cookies)

    payload = {
        "chat_session_id": chat_session_id,
        "parent_message_id": parent_message_id,
        "prompt": message,
        "thinking_enabled": thinking_enabled,
        "search_enabled": search_enabled,
    }

    if model:
        payload["model"] = model

    async with httpx.AsyncClient(base_url=DEEPSEEK_BASE_URL, timeout=120) as client:
        try:
            async with client.stream("POST", DEEPSEEK_CHAT_ENDPOINT, headers=headers, json=payload) as resp:
                if resp.status_code == 401:
                    yield {"type": "error", "content": "DeepSeek 认证失败，token 可能已过期"}
                    return

                if resp.status_code == 429:
                    yield {"type": "error", "content": "DeepSeek 请求频率过高，请稍后重试"}
                    return

                if resp.status_code != 200:
                    body = await resp.aread()
                    yield {"type": "error", "content": f"DeepSeek 请求失败: {resp.status_code} {body.decode(errors='ignore')}"}
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

                        if data.get("type") == "pow":
                            pow_challenge = data.get("data", data)
                            pow_response = await _solve_pow(pow_challenge)
                            headers["X-Ds-Pow-Response"] = pow_response
                            async for event in _retry_with_pow(client, headers, payload):
                                yield event
                            return

                        choices = data.get("choices", [])
                        if not choices:
                            msg_type = data.get("type", "")
                            if msg_type == "thinking":
                                thinking_content = data.get("content", data.get("data", {}).get("content", ""))
                                if thinking_content:
                                    yield {"type": "thinking", "content": thinking_content}
                            elif msg_type == "search":
                                search_content = data.get("content", data.get("data", {}).get("content", ""))
                                if search_content:
                                    yield {"type": "search", "content": search_content}
                            elif msg_type == "tool_call":
                                tool_data = data.get("data", data.get("content", ""))
                                yield {"type": "tool_call", "content": json.dumps(tool_data) if isinstance(tool_data, dict) else str(tool_data)}
                            elif msg_type == "tool_result":
                                tool_result = data.get("data", data.get("content", ""))
                                yield {"type": "tool_result", "content": json.dumps(tool_result) if isinstance(tool_result, dict) else str(tool_result)}
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

                            if delta.get("search_info"):
                                yield {"type": "search", "content": json.dumps(delta["search_info"])}

        except httpx.TimeoutException:
            yield {"type": "error", "content": "DeepSeek 请求超时"}
        except httpx.ConnectError:
            yield {"type": "error", "content": "无法连接 DeepSeek 服务器"}
        except Exception as e:
            yield {"type": "error", "content": f"DeepSeek 服务异常: {str(e)}"}
