import asyncio
import json
import os
import struct
import uuid
import webbrowser
from pathlib import Path
from typing import Optional

from app.config import DEEPSEEK_BASE_URL, QWEN_BASE_URL, POLL_INTERVAL, POLL_MAX_DURATION

_poll_tasks: dict = {}


def read_browser_cookies(domain: str) -> Optional[str]:
    try:
        import rookiepy
        cookies = rookiepy.load(domain=domain)
        if isinstance(cookies, list):
            parts = []
            for c in cookies:
                name = c.get("name", "")
                value = c.get("value", "")
                if name and value:
                    parts.append(f"{name}={value}")
            return "; ".join(parts) if parts else None
        elif isinstance(cookies, dict):
            parts = []
            for name, value in cookies.items():
                if name and value:
                    parts.append(f"{name}={value}")
            return "; ".join(parts) if parts else None
        return None
    except ImportError:
        return None
    except Exception:
        return None


def _find_leveldb_dirs(profile_path: Path):
    leveldb_dirs = []
    if not profile_path.exists():
        return leveldb_dirs
    for item in profile_path.iterdir():
        if item.is_dir():
            for sub in item.iterdir():
                if sub.is_dir() and "leveldb" in sub.name.lower():
                    leveldb_dirs.append(sub)
    return leveldb_dirs


def _parse_leveldb_log(file_path: Path) -> list[str]:
    results = []
    try:
        data = file_path.read_bytes()
        offset = 0
        while offset < len(data):
            if offset + 12 > len(data):
                break
            crc = struct.unpack_from("<I", data, offset)[0]
            length = struct.unpack_from("<I", data, offset + 4)[0]
            _type = data[offset + 8]
            if length == 0 or offset + 12 + length > len(data):
                offset += 12
                continue
            record = data[offset + 12 : offset + 12 + length]
            try:
                text = record.decode("utf-8", errors="ignore")
                results.append(text)
            except Exception:
                pass
            offset += 12 + length
    except Exception:
        pass
    return results


def read_local_storage_token(domain: str) -> Optional[str]:
    token_key = "userToken" if "deepseek" in domain else "token"
    home = Path.home()

    chrome_default = home / ".config/google-chrome/Default/Local Storage/leveldb"
    edge_default = home / ".config/microsoft-edge/Default/Local Storage/leveldb"

    leveldb_paths = []
    if chrome_default.exists():
        leveldb_paths.append(chrome_default)
    if edge_default.exists():
        leveldb_paths.append(edge_default)

    for base in [home / ".config/google-chrome", home / ".config/microsoft-edge"]:
        if base.exists():
            leveldb_paths.extend(_find_leveldb_dirs(base))

    for ldb_path in leveldb_paths:
        if not ldb_path.exists():
            continue
        for f in ldb_path.iterdir():
            if f.suffix in (".log", ".ldb"):
                entries = _parse_leveldb_log(f)
                for entry in entries:
                    if token_key in entry and domain in entry:
                        import re
                        patterns = [
                            rf'"{token_key}"\s*:\s*"([^"]+)"',
                            rf"{token_key}['\"]?\s*[:=]\s*['\"]?([A-Za-z0-9_\-\.]+)",
                        ]
                        for pattern in patterns:
                            match = re.search(pattern, entry)
                            if match:
                                return match.group(1)

    return None


async def auto_detect(platform: str) -> Optional[dict]:
    domain = "deepseek.com" if platform == "deepseek" else "qwen.ai"
    base_url = DEEPSEEK_BASE_URL if platform == "deepseek" else QWEN_BASE_URL

    token = read_local_storage_token(domain)
    cookies = read_browser_cookies(domain)

    if not token and not cookies:
        return None

    return {
        "platform": platform,
        "token": token or "",
        "cookies": cookies or "",
        "source": "auto_detect",
    }


async def start_login_poll(platform: str) -> str:
    task_id = str(uuid.uuid4())
    _poll_tasks[task_id] = {
        "platform": platform,
        "status": "polling",
        "result": None,
        "elapsed": 0,
    }

    domain = "deepseek.com" if platform == "deepseek" else "qwen.ai"
    base_url = DEEPSEEK_BASE_URL if platform == "deepseek" else QWEN_BASE_URL

    try:
        webbrowser.open(base_url)
    except Exception:
        pass

    asyncio.create_task(_poll_loop(task_id, platform, domain))

    return task_id


async def _poll_loop(task_id: str, platform: str, domain: str) -> None:
    elapsed = 0
    while elapsed < POLL_MAX_DURATION:
        await asyncio.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

        if task_id not in _poll_tasks:
            return

        _poll_tasks[task_id]["elapsed"] = elapsed

        token = read_local_storage_token(domain)
        cookies = read_browser_cookies(domain)

        if token or cookies:
            _poll_tasks[task_id]["status"] = "found"
            _poll_tasks[task_id]["result"] = {
                "platform": platform,
                "token": token or "",
                "cookies": cookies or "",
                "source": "login_poll",
            }
            return

    _poll_tasks[task_id]["status"] = "timeout"
    _poll_tasks[task_id]["result"] = None


def get_poll_status(task_id: str) -> Optional[dict]:
    task = _poll_tasks.get(task_id)
    if not task:
        return None
    return {
        "task_id": task_id,
        "platform": task["platform"],
        "status": task["status"],
        "result": task["result"],
        "elapsed": task["elapsed"],
    }
