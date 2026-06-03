"""Cookie 存储管理。

每条记录形如：
{
    "provider": "deepseek" | "qwen",
    "domain": "chat.deepseek.com",
    "cookies": [{"name": "...", "value": "...", "path": "/", ...}, ...],
    "headers": {"Authorization": "Bearer xxx"},  # 某些平台除了 cookie 还要求 Bearer
    "user_id": "u_abc",
    "captured_at": "2026-06-03T12:34:56Z",
    "expires_at": "2026-06-10T12:34:56Z"  # 估算
}
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from loguru import logger

from app.core.config import get_settings
from app.core.crypto import CryptoManager, DecryptionError


class CookieStore:
    """加密的 Cookie 存储。每个 provider 一条记录。"""

    SUPPORTED_PROVIDERS = ("deepseek", "qwen")

    def __init__(self) -> None:
        settings = get_settings()
        self.path: Path = settings.cookies_file
        self.crypto = CryptoManager(settings.master_key_file)
        self._cache: dict[str, dict] | None = None

    def _load(self) -> dict[str, dict]:
        if self._cache is not None:
            return self._cache
        if not self.path.exists():
            self._cache = {}
            return self._cache
        try:
            data = self.crypto.decrypt_from_file(self.path)
            if not isinstance(data, dict):
                raise DecryptionError("Cookie 文件根对象必须是 dict")
            self._cache = data
            return data
        except (DecryptionError, FileNotFoundError) as exc:
            logger.warning(f"Cookie 文件加载失败 ({exc})，将重置为空")
            self._cache = {}
            return self._cache

    def _flush(self) -> None:
        if self._cache is None:
            return
        self.crypto.encrypt_to_file(self.path, self._cache)

    # ---------- 公共 API ----------

    def save(self, provider: str, record: dict) -> None:
        if provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(f"未知 provider: {provider}")
        record = {**record, "provider": provider, "updated_at": _now_iso()}
        data = self._load()
        data[provider] = record
        self._flush()
        logger.info(f"已保存 {provider} 的 cookie 记录")

    def get(self, provider: str) -> dict | None:
        data = self._load()
        return data.get(provider)

    def all(self) -> dict[str, dict]:
        return dict(self._load())

    def delete(self, provider: str) -> bool:
        data = self._load()
        if provider in data:
            data.pop(provider)
            self._flush()
            return True
        return False

    def status(self, provider: str) -> dict:
        """返回某个 provider 的状态（用于前端展示）。"""
        record = self.get(provider)
        if not record:
            return {"provider": provider, "configured": False}
        cookies = record.get("cookies", [])
        domains = sorted({c.get("domain", "") for c in cookies})
        return {
            "provider": provider,
            "configured": True,
            "cookie_count": len(cookies),
            "domains": domains,
            "user_id": record.get("user_id"),
            "updated_at": record.get("updated_at"),
            "expires_at": record.get("expires_at"),
            "healthy": self._is_healthy(record),
        }

    def _is_healthy(self, record: dict) -> bool:
        """简单的健康度判断：1) 有 cookies 2) 距离捕获 < 7 天。"""
        if not record.get("cookies"):
            return False
        updated_at = record.get("updated_at")
        if not updated_at:
            return False
        try:
            ts = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return False
        return datetime.now(tz=timezone.utc) - ts < timedelta(days=7)


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


# 单例
_store: CookieStore | None = None


def get_cookie_store() -> CookieStore:
    global _store
    if _store is None:
        _store = CookieStore()
    return _store
