"""Claw 后端入口。

启动方式：
    python -m app.main
    python -m app.main --port 8765 --reload
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# 确保相对导入工作
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn
from loguru import logger

from app.core.config import get_settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Claw Zero Token backend")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", type=int, default=8765, help="Bind port")
    parser.add_argument("--reload", action="store_true", help="Auto-reload (dev)")
    parser.add_argument(
        "--log-level",
        default="info",
        choices=["critical", "error", "warning", "info", "debug", "trace"],
    )
    args = parser.parse_args()

    settings = get_settings()
    logger.remove()
    logger.add(
        sys.stdout,
        level=args.log_level.upper(),
        colorize=True,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <7}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    )
    logger.info(f"启动 Claw 后端，监听 {args.host}:{args.port}")
    logger.info(f"存储目录: {settings.storage_dir}")

    uvicorn.run(
        "app.api.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level=args.log_level,
        access_log=False,
    )


if __name__ == "__main__":
    main()
