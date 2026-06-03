"""一键引导脚本：自动启 Chrome + 等用户登录 + 抓 Cookie + 验证。

参考 OpenClaw Zero Token 的 `onboard.sh` 思路，完整 Python 实现。

用法：
    python -m scripts.onboard --provider deepseek
    python -m scripts.onboard --provider qwen
    python -m scripts.onboard --provider deepseek --no-launch  # 外部已启 Chrome
"""
from __future__ import annotations

import argparse
import json
import platform
import shutil
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger

from app.core.config import get_settings
from app.core.cookie_store import get_cookie_store
from app.providers.registry import PROVIDER_REGISTRY

DEFAULT_PORT = 9222
PROVIDER_URLS = {
    "deepseek": "https://chat.deepseek.com",
    "qwen": "https://chat.qwen.ai",
}


def find_chrome() -> str | None:
    candidates: list[list[str]] = []
    sysname = platform.system().lower()
    if sysname == "windows":
        candidates = [
            [r"C:\Program Files\Google\Chrome\Application\chrome.exe"],
            [r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"],
            [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"],
            [r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"],
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
    return shutil.which("google-chrome") or shutil.which("msedge") or shutil.which("chrome")


def launch_chrome(user_data_dir: Path, port: int, start_url: str) -> bool:
    exe = find_chrome()
    if not exe:
        logger.error("找不到 Chrome 或 Edge。请先安装。")
        return False
    user_data_dir.mkdir(parents=True, exist_ok=True)
    args = [
        exe,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ]
    if start_url:
        args.append(start_url)
    logger.info(f"启动 Chrome: {exe}")
    logger.info(f"  user-data-dir: {user_data_dir}")
    logger.info(f"  debug port: {port}")
    if start_url:
        logger.info(f"  start URL: {start_url}")

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
    except Exception as exc:  # noqa: BLE001
        logger.error(f"启动 Chrome 失败: {exc}")
        return False


def wait_for_cdp(port: int, timeout: float = 15.0) -> bool:
    """等 Chrome 调试端口起来。"""
    import urllib.request

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=2)
            return True
        except Exception:  # noqa: BLE001
            time.sleep(0.5)
    return False


def wait_for_login(port: int, provider_name: str, timeout: float = 300.0) -> bool:
    """轮询 CDP 直到抓到该 provider 域名的会话 cookie。"""
    import urllib.request

    provider_cls = PROVIDER_REGISTRY[provider_name]
    domains = provider_cls.domains
    target_names = _expected_cookie_names(provider_name)
    deadline = time.time() + timeout
    last_seen = 0
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2) as r:
                targets = json.loads(r.read().decode("utf-8"))
        except Exception:  # noqa: BLE001
            time.sleep(1.0)
            continue
        if not targets:
            time.sleep(1.0)
            continue
        # 找 page 类型的 target，抓 url
        for t in targets:
            url = t.get("url", "")
            if not any(d.replace(".", "") in url.replace("https://", "").replace("http://", "").replace("/", "") for d in domains):
                continue
            # 这个 target 看起来是 provider 域的，尝试拉 cookie
            ws = t.get("webSocketDebuggerUrl")
            if not ws:
                continue
            cookies = _fetch_cookies_for_target(ws, domains)
            if cookies and any(c.get("name") in target_names for c in cookies):
                # 找到登录态
                logger.info(f"检测到登录态: {len(cookies)} 个 cookies")
                # 顺手存
                get_cookie_store().save(
                    provider_name,
                    {"cookies": cookies, "headers": {}, "user_id": _guess_user_id(cookies)},
                )
                logger.info(f"已保存到 {get_cookie_store().path}")
                return True
        elapsed = int(time.time() - (deadline - timeout))
        if elapsed - last_seen >= 10:
            logger.info(f"等待登录... 已过 {elapsed}s")
            last_seen = elapsed
        time.sleep(2.0)
    return False


def _expected_cookie_names(provider: str) -> set[str]:
    """各平台登录态的特征 cookie 名。"""
    if provider == "deepseek":
        return {"userToken", "user_token", "session_id", "sid"}
    if provider == "qwen":
        return {"acw_tc", "login_aliyunid_ticket", "login_ticket", "aui", "t"}
    return set()


def _guess_user_id(cookies: list[dict]) -> str | None:
    for c in cookies:
        if c.get("name", "").lower() in {"userid", "user_id", "userId", "uid"}:
            return c.get("value")
    return None


def _fetch_cookies_for_target(ws_url: str, domains: list[str]) -> list[dict]:
    import websockets  # type: ignore

    async def fetch() -> list[dict]:
        async with websockets.connect(ws_url, max_size=20 * 1024 * 1024) as ws:
            await ws.send(json.dumps({"id": 1, "method": "Network.getAllCookies"}))
            for _ in range(50):
                try:
                    raw = await ws.recv()
                except Exception:  # noqa: BLE001
                    return []
                msg = json.loads(raw)
                if msg.get("id") == 1:
                    cookies = msg.get("result", {}).get("cookies", [])
                    if domains:
                        cookies = [
                            c
                            for c in cookies
                            if any(d in c.get("domain", "") for d in domains)
                        ]
                    return cookies
        return []

    try:
        import asyncio

        return asyncio.run(fetch())
    except Exception as exc:  # noqa: BLE001
        logger.debug(f"_fetch_cookies_for_target error: {exc}")
        return []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--provider", required=True, choices=list(PROVIDER_REGISTRY.keys())
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument(
        "--no-launch", action="store_true", help="外部已启 Chrome"
    )
    parser.add_argument(
        "--timeout", type=int, default=300, help="等待登录超时（秒）"
    )
    parser.add_argument(
        "--open-browser",
        action="store_true",
        help="额外用系统默认浏览器打开（一般不需要）",
    )
    args = parser.parse_args()

    settings = get_settings()
    url = PROVIDER_URLS[args.provider]
    domains = PROVIDER_REGISTRY[args.provider].domains

    if not args.no_launch:
        if not launch_chrome(settings.chrome_user_data_dir, args.port, url):
            sys.exit(1)
        if not wait_for_cdp(args.port):
            logger.error("Chrome 调试端口未起来")
            sys.exit(1)
        logger.info("Chrome 已就绪")
    if args.open_browser:
        try:
            webbrowser.open(url)
        except Exception:  # noqa: BLE001
            pass

    logger.info(f"在弹出的 Chrome 里登录 {args.display_name if hasattr(args, 'display_name') else args.provider}...")
    logger.info("程序会每 2 秒轮询一次，登录后自动保存 Cookie。")
    ok = wait_for_login(args.port, args.provider, timeout=args.timeout)
    if ok:
        # 立即验证
        import asyncio

        from app.providers.registry import get_provider

        provider = get_provider(args.provider)
        if provider:
            try:
                healthy = asyncio.run(provider.validate())
                if healthy:
                    logger.info(f"✓ {args.provider} 验证通过！")
                else:
                    logger.warning(
                        f"⚠ {args.provider} 验证未通过（可能风控），但 Cookie 已保存。可以直接试一次对话。"
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"验证异常: {exc}")
    else:
        logger.error(f"✗ 等待登录超时（{args.timeout}s）。下次再试。")
        sys.exit(1)


if __name__ == "__main__":
    main()
