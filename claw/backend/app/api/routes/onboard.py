"""一键引导 API 端点。"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.core.config import get_settings
from app.core.cookie_store import get_cookie_store
from app.providers.registry import get_provider, PROVIDER_REGISTRY
from scripts.bootstrap_chrome import (
    find_chrome_executable,
    launch_chrome,
    fetch_cdp_targets,
)

router = APIRouter(prefix="/onboard", tags=["onboard"])


class OnboardStartIn(BaseModel):
    provider: str
    no_launch: bool = False
    timeout: int = 300


class OnboardCaptureIn(BaseModel):
    provider: str
    port: int = 9222


@router.post("/start")
async def onboard_start(payload: OnboardStartIn) -> dict:
    """启动 Chrome 调试模式 + 打开 provider 登录页。

    不会等待登录完成，调用方随后轮询 /onboard/capture 抓 cookie。
    """
    if payload.provider not in PROVIDER_REGISTRY:
        raise HTTPException(400, f"Unknown provider: {payload.provider}")
    settings = get_settings()
    if not payload.no_launch:
        url = (
            "https://chat.deepseek.com"
            if payload.provider == "deepseek"
            else "https://chat.qwen.ai"
        )
        ok = launch_chrome_local(settings.chrome_user_data_dir, 9222, url)
        if not ok:
            raise HTTPException(500, "启动 Chrome 失败，请确认已安装 Chrome/Edge")
        # 简单等端口
        await _wait_for_cdp(9222, timeout=10)
    return {"ok": True, "message": "Chrome 已启动，请登录"}


@router.post("/capture")
async def onboard_capture(payload: OnboardCaptureIn) -> dict:
    """从 CDP 抓 cookie 并保存。"""
    if payload.provider not in PROVIDER_REGISTRY:
        raise HTTPException(400, f"Unknown provider: {payload.provider}")
    domains = PROVIDER_REGISTRY[payload.provider].domains
    cookies, headers = await _capture_cookies(payload.port, domains)
    if not cookies:
        raise HTTPException(404, "没有抓到 cookies，请先登录再试")
    record = {
        "cookies": cookies,
        "headers": headers,
        "user_id": next(
            (
                c["value"]
                for c in cookies
                if c.get("name", "").lower() in {"userid", "user_id", "uid"}
            ),
            None,
        ),
    }
    get_cookie_store().save(payload.provider, record)
    # 立即验证
    provider = get_provider(payload.provider)
    healthy = False
    if provider:
        try:
            healthy = await provider.validate()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"validate 异常: {exc}")
    return {
        "ok": True,
        "provider": payload.provider,
        "cookie_count": len(cookies),
        "healthy": healthy,
    }


# ----- helpers -----

def launch_chrome_local(user_data_dir, port, start_url) -> bool:
    exe = find_chrome_executable()
    if not exe:
        return False
    user_data_dir.mkdir(parents=True, exist_ok=True)
    import platform, subprocess
    args = [
        exe,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ]
    if start_url:
        args.append(start_url)
    creationflags = 0
    if platform.system().lower() == "windows":
        creationflags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    try:
        subprocess.Popen(
            args,
            creationflags=creationflags,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except Exception:
        return False


async def _wait_for_cdp(port: int, timeout: float = 10.0) -> bool:
    import time
    import urllib.request

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=2)
            return True
        except Exception:
            await asyncio.sleep(0.5)
    return False


async def _capture_cookies(port: int, domains: list[str]) -> tuple[list[dict], dict]:
    import websockets  # type: ignore
    targets = fetch_cdp_targets(port)
    browser_ws = None
    for t in targets:
        if t.get("type") == "browser" and t.get("webSocketDebuggerUrl"):
            browser_ws = t["webSocketDebuggerUrl"]
            break
    if not browser_ws:
        return [], {}
    async with websockets.connect(browser_ws, max_size=20 * 1024 * 1024) as ws:
        await ws.send(json.dumps({"id": 1, "method": "Network.getAllCookies"}))
        cookies: list[dict] = []
        for _ in range(50):
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=10)
            except asyncio.TimeoutError:
                break
            msg = json.loads(raw)
            if msg.get("id") == 1:
                cookies = msg.get("result", {}).get("cookies", [])
                break
    if domains:
        cookies = [c for c in cookies if any(d in c.get("domain", "") for d in domains)]
    return cookies, {}
