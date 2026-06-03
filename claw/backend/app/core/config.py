"""应用配置。"""
from __future__ import annotations

import os
import platform
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Claw 后端配置。所有字段都可以通过环境变量覆盖。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="CLAW_",
        case_sensitive=False,
        extra="ignore",
    )

    # 存储
    storage_dir: Path = Path.home() / ".claw" / "storage"
    # 会话文件（明文 JSON，存消息历史等）
    sessions_dir: Path = Path.home() / ".claw" / "sessions"
    # Cookie 加密文件
    cookies_file: Path = Path.home() / ".claw" / "cookies.enc"
    # 主密钥文件
    master_key_file: Path = Path.home() / ".claw" / "master.key"

    # Chrome 调试模式
    chrome_debug_port: int = 9222
    chrome_user_data_dir: Path = Path.home() / ".claw" / "chrome-data"

    # 服务
    host: str = "127.0.0.1"
    port: int = 8765
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:1420",
        "tauri://localhost",
    ]

    # Provider 配置
    request_timeout: float = 120.0
    stream_chunk_size: int = 64

    # 工具调用
    tool_workspace: Path = Path.home() / ".claw" / "workspace"
    tool_max_runtime: int = 30  # 秒
    tool_dangerous_patterns: list[str] = [
        r"rm\s+-rf\s+/",
        r"format\s+[a-zA-Z]:",
        r"del\s+/[qsf]",
        r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:",  # fork bomb
    ]

    @property
    def is_windows(self) -> bool:
        return platform.system().lower() == "windows"

    def ensure_dirs(self) -> None:
        """确保所有目录存在。"""
        for d in [
            self.storage_dir,
            self.sessions_dir,
            self.tool_workspace,
            self.chrome_user_data_dir,
        ]:
            d.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_dirs()
    return settings
