"""工具调用框架。"""
from __future__ import annotations

import abc
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from loguru import logger

from app.core.config import get_settings


class ToolContext:
    """工具执行的上下文。"""

    def __init__(self, workspace: Path | None = None) -> None:
        settings = get_settings()
        self.workspace: Path = (workspace or settings.tool_workspace).resolve()
        self.workspace.mkdir(parents=True, exist_ok=True)

    def resolve_path(self, p: str) -> Path:
        """解析到工作区内的一个绝对路径，越界则抛错。"""
        candidate = (self.workspace / p).resolve() if not Path(p).is_absolute() else Path(p).resolve()
        try:
            candidate.relative_to(self.workspace)
        except ValueError as exc:
            raise PermissionError(f"路径越出工作区: {p}") from exc
        return candidate


class BaseTool(abc.ABC):
    name: str = "base"
    description: str = ""
    parameters: dict = {}

    def __init__(self, ctx: ToolContext) -> None:
        self.ctx = ctx

    @abc.abstractmethod
    async def run(self, **kwargs: Any) -> str:  # pragma: no cover
        raise NotImplementedError


class ExecTool(BaseTool):
    name = "exec"
    description = "在工作区内执行一个 shell 命令。返回 stdout/stderr 截断后内容。"
    parameters = {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "要执行的 shell 命令"},
            "timeout": {"type": "integer", "description": "超时秒数，默认 30"},
        },
        "required": ["command"],
    }

    _DANGEROUS = [
        r"rm\s+-rf\s+/",
        r"format\s+[a-zA-Z]:",
        r"del\s+/[qsf]",
        r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:",  # fork bomb
    ]

    async def run(self, command: str, timeout: int | None = None) -> str:
        settings = get_settings()
        # 危险命令检查
        for pat in settings.tool_dangerous_patterns:
            if re.search(pat, command, re.IGNORECASE):
                return f"[exec] 拒绝执行: 命令匹配危险模式 `{pat}`"
        timeout = min(timeout or settings.tool_max_runtime, settings.tool_max_runtime)
        try:
            proc = subprocess.run(
                command,
                shell=True,
                cwd=self.ctx.workspace,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            out = proc.stdout
            err = proc.stderr
            truncated = False
            if len(out) > 4000:
                out = out[:4000] + "\n... [truncated]"
                truncated = True
            if len(err) > 2000:
                err = err[:2000] + "\n... [truncated]"
                truncated = True
            return (
                f"[exit={proc.returncode}]\n"
                f"--- stdout ---\n{out or '(empty)'}\n"
                f"--- stderr ---\n{err or '(empty)'}"
            )
        except subprocess.TimeoutExpired:
            return f"[exec] 命令超时 (> {timeout}s)"
        except Exception as exc:  # noqa: BLE001
            return f"[exec] 执行失败: {exc}"


class ReadFileTool(BaseTool):
    name = "read_file"
    description = "读取工作区内的一个文件。"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "相对工作区的路径"},
            "max_lines": {"type": "integer", "description": "最多读多少行，默认 500"},
        },
        "required": ["path"],
    }

    async def run(self, path: str, max_lines: int = 500) -> str:
        try:
            p = self.ctx.resolve_path(path)
            if not p.exists():
                return f"[read_file] 文件不存在: {path}"
            if p.is_dir():
                return f"[read_file] {path} 是目录（请用 list_dir）"
            text = p.read_text(encoding="utf-8", errors="replace")
            lines = text.splitlines()
            if len(lines) > max_lines:
                lines = lines[:max_lines] + [f"... [truncated, total {len(lines)} lines]"]
            return "\n".join(lines)
        except PermissionError as exc:
            return f"[read_file] 权限拒绝: {exc}"
        except Exception as exc:  # noqa: BLE001
            return f"[read_file] 读取失败: {exc}"


class WriteFileTool(BaseTool):
    name = "write_file"
    description = "在工作区内写入一个文件。覆盖写入。"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "相对工作区的路径"},
            "content": {"type": "string", "description": "完整文件内容"},
        },
        "required": ["path", "content"],
    }

    async def run(self, path: str, content: str) -> str:
        try:
            p = self.ctx.resolve_path(path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
            return f"[write_file] 已写入 {path} ({len(content)} 字符)"
        except PermissionError as exc:
            return f"[write_file] 权限拒绝: {exc}"
        except Exception as exc:  # noqa: BLE001
            return f"[write_file] 写入失败: {exc}"


class ListDirTool(BaseTool):
    name = "list_dir"
    description = "列出工作区或子目录的内容。"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "相对工作区的路径，默认为根"},
        },
    }

    async def run(self, path: str = ".") -> str:
        try:
            p = self.ctx.resolve_path(path)
            if not p.exists():
                return f"[list_dir] 路径不存在: {path}"
            if not p.is_dir():
                return f"[list_dir] {path} 不是目录"
            entries = []
            for entry in sorted(p.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
                marker = "/" if entry.is_dir() else ""
                size = "" if entry.is_dir() else f" ({entry.stat().st_size}B)"
                entries.append(f"  {entry.name}{marker}{size}")
            header = f"[list_dir] {p} ({len(entries)} entries)"
            return header + "\n" + "\n".join(entries) if entries else header + " (empty)"
        except Exception as exc:  # noqa: BLE001
            return f"[list_dir] 列出失败: {exc}"


class WebSearchTool(BaseTool):
    name = "web_search"
    description = (
        "使用 DuckDuckGo Lite 进行无追踪的网页搜索（不需要 API key）。"
        "返回前 5 条结果的标题+链接+摘要。"
    )
    parameters = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "搜索关键词"},
            "max_results": {"type": "integer", "description": "最多返回多少条，默认 5"},
        },
        "required": ["query"],
    }

    async def run(self, query: str, max_results: int = 5) -> str:
        import httpx
        from bs4 import BeautifulSoup  # type: ignore

        url = "https://html.duckduckgo.com/html/"
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.post(
                    url,
                    data={"q": query, "kl": "us-en"},
                    headers={"User-Agent": "Mozilla/5.0 (compatible; Claw/0.1)"},
                )
                if resp.status_code != 200:
                    return f"[web_search] 搜索失败 HTTP {resp.status_code}"
                soup = BeautifulSoup(resp.text, "html.parser")
                results = []
                for item in soup.select("div.result"):
                    title_el = item.select_one("a.result__a")
                    snippet_el = item.select_one("a.result__snippet")
                    link_el = item.select_one("a.result__url")
                    if not title_el:
                        continue
                    title = title_el.get_text(strip=True)
                    snippet = snippet_el.get_text(strip=True) if snippet_el else ""
                    link = link_el.get("href") if link_el else title_el.get("href", "")
                    results.append(f"### {title}\n{snippet}\n{link}")
                    if len(results) >= max_results:
                        break
                if not results:
                    return f"[web_search] 没有找到结果: {query}"
                return f"[web_search] 关键词: {query}\n\n" + "\n\n".join(results)
        except Exception as exc:  # noqa: BLE001
            return f"[web_search] 搜索失败: {exc}"


# 内置工具清单
BUILTIN_TOOLS: list[type[BaseTool]] = [
    ExecTool,
    ReadFileTool,
    WriteFileTool,
    ListDirTool,
    WebSearchTool,
]


def get_tool_registry(ctx: ToolContext) -> dict[str, BaseTool]:
    """根据 context 构造工具实例。"""
    return {cls.name: cls(ctx) for cls in BUILTIN_TOOLS}


def tool_specs() -> list[dict]:
    """导出工具的 JSON Schema（用于发给模型）。"""
    from app.providers.base import ToolSpec

    ctx = ToolContext()
    return [
        ToolSpec(name=t.name, description=t.description, parameters=t.parameters)
        for t in BUILTIN_TOOLS
    ]
