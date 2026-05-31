import asyncio
import json
import os
import shutil
import struct
import tempfile
import uuid
import webbrowser
import logging
from pathlib import Path
from typing import Optional

from app.config import DEEPSEEK_BASE_URL, QWEN_BASE_URL, POLL_INTERVAL, POLL_MAX_DURATION
from app.services.credential_store import save_credential

logger = logging.getLogger(__name__)

_poll_tasks: dict = {}


async def _cleanup_task(task_id: str, delay: int = 60) -> None:
    await asyncio.sleep(delay)
    _poll_tasks.pop(task_id, None)


def read_browser_cookies(domain: str) -> Optional[str]:
    try:
        import rookiepy
        browser_funcs = []
        for name in ["chrome", "edge", "firefox"]:
            func = getattr(rookiepy, name, None)
            if func:
                browser_funcs.append(func)
        for browser_func in browser_funcs:
            try:
                cookies = browser_func([domain])
                if not cookies:
                    continue
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
            except Exception as e:
                logger.debug("rookiepy %s failed: %s", browser_func.__name__, e)
                continue
        return None
    except ImportError:
        logger.debug("rookiepy not installed")
        return None
    except Exception as e:
        logger.debug("read_browser_cookies error: %s", e)
        return None


def _find_leveldb_dirs(profile_path: Path):
    leveldb_dirs = []
    if not profile_path.exists():
        return leveldb_dirs
    try:
        items = list(profile_path.iterdir())
    except PermissionError:
        return leveldb_dirs
    for item in items:
        if item.is_dir():
            try:
                for sub in item.iterdir():
                    if sub.is_dir() and "leveldb" in sub.name.lower():
                        leveldb_dirs.append(sub)
            except (PermissionError, OSError):
                continue
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
    except (PermissionError, OSError) as e:
        logger.debug("Cannot read leveldb file %s: %s", file_path, e)
    except Exception as e:
        logger.debug("Parse leveldb error: %s", e)
    return results


def read_local_storage_token(domain: str) -> Optional[str]:
    token_key = "userToken" if "deepseek" in domain else "token"
    home = Path.home()
    local_app = os.environ.get("LOCALAPPDATA", "")
    app_data = os.environ.get("APPDATA", "")

    leveldb_paths = []

    if os.name == "nt" or local_app:
        chrome_win = Path(local_app) / "Google/Chrome/User Data/Default/Local Storage/leveldb"
        edge_win = Path(local_app) / "Microsoft/Edge/User Data/Default/Local Storage/leveldb"
        if chrome_win.exists():
            leveldb_paths.append(chrome_win)
        if edge_win.exists():
            leveldb_paths.append(edge_win)
        for profile_dir in ["Profile 1", "Profile 2", "Profile 3"]:
            cp = Path(local_app) / f"Google/Chrome/User Data/{profile_dir}/Local Storage/leveldb"
            ep = Path(local_app) / f"Microsoft/Edge/User Data/{profile_dir}/Local Storage/leveldb"
            if cp.exists():
                leveldb_paths.append(cp)
            if ep.exists():
                leveldb_paths.append(ep)

    chrome_linux = home / ".config/google-chrome/Default/Local Storage/leveldb"
    edge_linux = home / ".config/microsoft-edge/Default/Local Storage/leveldb"
    if chrome_linux.exists():
        leveldb_paths.append(chrome_linux)
    if edge_linux.exists():
        leveldb_paths.append(edge_linux)

    for base in [home / ".config/google-chrome", home / ".config/microsoft-edge"]:
        if base.exists():
            leveldb_paths.extend(_find_leveldb_dirs(base))

    for ldb_path in leveldb_paths:
        if not ldb_path.exists():
            continue
        try:
            files_to_read = [f for f in ldb_path.iterdir() if f.suffix in (".log", ".ldb")]
        except PermissionError:
            logger.debug("Permission denied listing %s", ldb_path)
            continue

        for f in files_to_read:
            copied_file = None
            try:
                fd, tmp_path = tempfile.mkstemp(suffix=f.suffix)
                os.close(fd)
                shutil.copy2(str(f), tmp_path)
                copied_file = Path(tmp_path)
                entries = _parse_leveldb_log(copied_file)
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
                                token_val = match.group(1)
                                if len(token_val) > 10:
                                    return token_val
            except (PermissionError, OSError) as e:
                logger.debug("Cannot process file %s: %s", f, e)
            finally:
                if copied_file and copied_file.exists():
                    try:
                        copied_file.unlink()
                    except OSError:
                        pass

    return None


async def auto_detect(platform: str) -> Optional[dict]:
    domain = "deepseek.com" if platform == "deepseek" else "qwen.ai"

    token = await asyncio.to_thread(read_local_storage_token, domain)
    cookies = await asyncio.to_thread(read_browser_cookies, domain)

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
        opened = webbrowser.open(base_url)
        if opened:
            logger.info("Opened %s in system browser for %s login", base_url, platform)
        else:
            logger.warning("webbrowser.open() returned False for %s, trying fallback", base_url)
            if os.name == "nt":
                os.startfile(base_url)
                logger.info("Opened %s via os.startfile", base_url)
    except Exception as e:
        logger.error("Failed to open browser for %s login: %s", platform, e)
        if os.name == "nt":
            try:
                os.startfile(base_url)
                logger.info("Fallback: opened %s via os.startfile", base_url)
            except Exception as e2:
                logger.error("Fallback os.startfile also failed: %s", e2)

    asyncio.create_task(_poll_loop(task_id, platform, domain))

    return task_id


async def _poll_loop(task_id: str, platform: str, domain: str) -> None:
    elapsed = 0
    found_count = 0
    while elapsed < POLL_MAX_DURATION:
        await asyncio.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

        if task_id not in _poll_tasks:
            return

        _poll_tasks[task_id]["elapsed"] = elapsed

        try:
            token = await asyncio.to_thread(read_local_storage_token, domain)
            cookies = await asyncio.to_thread(read_browser_cookies, domain)
        except Exception as e:
            logger.debug("Poll read error at %ds: %s", elapsed, e)
            continue

        if token or cookies:
            save_credential(platform, token or "", cookies or "")
            _poll_tasks[task_id]["status"] = "found"
            _poll_tasks[task_id]["result"] = {
                "platform": platform,
                "token": token or "",
                "cookies": cookies or "",
                "source": "login_poll",
            }
            logger.info("Found %s credentials after %ds (token=%s, cookies=%s)",
                       platform, elapsed, bool(token), bool(cookies))
            asyncio.create_task(_cleanup_task(task_id, delay=60))
            return

        if elapsed > 10 and elapsed % 10 < POLL_INTERVAL:
            logger.info("Still polling %s after %ds...", platform, elapsed)

    _poll_tasks[task_id]["status"] = "timeout"
    _poll_tasks[task_id]["result"] = None
    logger.warning("%s poll timed out after %ds", platform, POLL_MAX_DURATION)
    asyncio.create_task(_cleanup_task(task_id, delay=60))


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
