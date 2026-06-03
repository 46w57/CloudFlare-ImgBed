"""Chrome 调试模式启动 + CDP Cookie 捕获脚本。

参考 OpenClaw Zero Token 的 `start-chrome-debug.sh` 思路改写为 Python。

用法：
    # 启动 Chrome（带调试端口）
    python -m scripts.bootstrap_chrome

    # 指定 provider
    python -m scripts.bootstrap_chrome --provider deepseek

    # 启动后只打开 URL，不拉起 Chrome（外部已经启了）
    python -m scripts.bootstrap_chrome --no-launch

    # 通过 CDP 直接抓 cookie（外部已登录）
    python -m scripts.bootstrap_chrome --capture-only --provider deepseek
"""
from __future__ import annotations

import argparse
import asyncio
import json
import platform
import subprocess
import sys
from pathlib import Path
from urllib.request import urlopen

# 让 scripts/ 可作为模块运行
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger

from app.core.config import get_settings
from app.core.cookie_store import get_cookie_store
from app.providers.registry import PROVIDER_REGISTRY

DEFAULT_PORT = 9222

PROVIDER_URLS = {
    "deepseek": "https://chat.deepseek.com/",
    "qwen": "https://chat.qwen.ai/",
}


def find_chrome_executable() -> str | None:
    """按平台找 Chrome/Edge 可执行文件路径。"""
    candidates: list[list[str]] = []
    sysname = platform.system().lower()
    if sysname == "windows":
        candidates = [
            [r"C:\Program Files\Google\Chrome\Application\chrome.exe"],
            [r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"],
            [
                rf"{platform.windows_profile() or ''}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
            ],
            [
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
            ],
            [
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
            ],
        ]
    elif sysname == "darwin":
        candidates = [
            ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
            ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
        ]
    else:
        candidates = [
            ["google-chrome"],
            ["google-chrome-stable"],
            ["chromium"],
            ["chromium-browser"],
            ["microsoft-edge"],
        ]
    for group in candidates:
        for path in group:
            try:
                p = Path(path)
                if p.exists() and p.is_file():
                    return str(p)
            except OSError:
                continue
    # 退到 which
    import shutil

    exe = shutil.which("google-chrome") or shutil.which("chrome") or shutil.which("msedge")
    return exe


def launch_chrome(user_data_dir: Path, port: int, start_url: str | None) -> None:
    exe = find_chrome_executable()
    if not exe:
        raise RuntimeError(
            "找不到 Chrome 或 Edge。请先安装 Google Chrome 或 Microsoft Edge。"
        )
    user_data_dir.mkdir(parents=True, exist_ok=True)
    args = [
        exe,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data_dir}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
    ]
    if start_url:
        args.append(start_url)
    logger.info(f"启动 Chrome: {exe}")
    logger.info(f"user-data-dir: {user_data_dir}")
    logger.info(f"debug port: {port}")
    if start_url:
        logger.info(f"启动 URL: {start_url}")
    # Windows 上以非阻塞方式启动，避免脚本被挂住
    creationflags = 0
    if platform.system().lower() == "windows":
        creationflags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    subprocess.Popen(
        args,
        creationflags=creationflags,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def fetch_cdp_targets(port: int) -> list[dict]:
    """通过 CDP HTTP API 列出所有可调试 target。"""
    url = f"http://127.0.0.1:{port}/json"
    with urlopen(url, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_cdp_version(port: int) -> dict:
    url = f"http://127.0.0.1:{port}/json/version"
    with urlopen(url, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))


def capture_cookies_via_cdp(port: int, domains: list[str]) -> tuple[list[dict], dict[str, str]]:
    """从所有 CDP target 里抽 cookies。返回 (cookies, headers)。"""
    targets = fetch_cdp_targets(port)
    all_cookies: list[dict] = []
    headers: dict[str, str] = {}

    # 简化：直接通过 `/json` 不一定能拿 cookies，
    # 真正抓 cookie 需要连 WebSocket 发 Network.getCookies。
    # 这里用 `browser` target 的 webSocketDebuggerUrl 进一步做。
    browser_ws = None
    for t in targets:
        if t.get("type") == "browser" and t.get("webSocketDebuggerUrl"):
            browser_ws = t["webSocketDebuggerUrl"]
            break
    if not browser_ws:
        raise RuntimeError("找不到 browser-level WebSocket，无法抓 cookies")

    import websockets

    async def fetch_all() -> tuple[list[dict], dict[str, str]]:
        async with websockets.connect(browser_ws, max_size=20 * 1024 * 1024) as ws:
            await ws.send(
                json.dumps(
                    {
                        "id": 1,
                        "method": "Network.getAllCookies",
                    }
                )
            )
            cookies: list[dict] = []
            auth: dict[str, str] = {}
            # Network.getAllCookies 可能不会一次回，继续读直到拿到 id=1
            for _ in range(200):
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=10)
                except asyncio.TimeoutError:
                    break
                msg = json.loads(raw)
                if msg.get("id") == 1:
                    cookies = msg.get("result", {}).get("cookies", [])
                    break
            # 按域名筛选
            if domains:
                cookies = [
                    c
                    for c in cookies
                    if any(d in c.get("domain", "") for d in domains)
                ]
            return cookies, auth

    cookies, auth = asyncio.run(fetch_all())
    return cookies, auth


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--provider", choices=list(PROVIDER_REGISTRY.keys()), help="目标 provider"
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument(
        "--no-launch", action="store_true", help="不启动 Chrome（外部已启）"
    )
    parser.add_argument(
        "--capture-only",
        action="store_true",
        help="只抓 cookies 并保存，不启动 Chrome",
    )
    args = parser.parse_args()

    settings = get_settings()

    if not args.capture_only and not args.no_launch:
        url = PROVIDER_URLS.get(args.provider) if args.provider else None
        launch_chrome(settings.chrome_user_data_dir, args.port, url)
        logger.info("请在打开的 Chrome 窗口里登录。登录完成后回这里按 Enter...")
        try:
            input()
        except EOFError:
            pass

    # 抓取
    logger.info(f"通过 CDP (port={args.port}) 抓取 cookies ...")
    if args.provider:
        domains = PROVIDER_REGISTRY[args.provider].domains
    else:
        domains = []
    cookies, headers = capture_cookies_via_cdp(args.port, domains)
    if not cookies:
        logger.error("没有抓到任何 cookies。请确认已经在 Chrome 里登录。")
        sys.exit(1)
    logger.info(f"抓到 {len(cookies)} 个 cookies")
    # 落盘
    target_provider = args.provider
    if target_provider is None:
        # 启发式：按域名猜
        if any("deepseek" in c.get("domain", "") for c in cookies):
            target_provider = "deepseek"
        elif any("qwen" in c.get("domain", "") or "aliyun" in c.get("domain", "") for c in cookies):
            target_provider = "qwen"
        else:
            logger.error("无法识别 provider，请明确传 --provider")
            sys.exit(1)
    get_cookie_store().save(
        target_provider,
        {
            "cookies": cookies,
            "headers": headers,
        },
    )
    logger.info(f"已保存到 {get_cookie_store().path}")


if __name__ == "__main__":
    main()
