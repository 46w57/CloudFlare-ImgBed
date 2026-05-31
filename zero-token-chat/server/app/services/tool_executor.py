import os
import subprocess
import re
import json
import asyncio
from pathlib import Path
from typing import Optional

from app.config import TOOL_SANDBOX_DIR

ALLOWED_TOOLS = {"exec", "read_file", "write_file", "list_dir", "apply_patch"}


def _validate_path(path_str: str) -> Path:
    target = (TOOL_SANDBOX_DIR / path_str).resolve()
    if not str(target).startswith(str(TOOL_SANDBOX_DIR.resolve())):
        raise ValueError(f"路径越界: {path_str}")
    return target


async def execute_tool(name: str, arguments: dict) -> str:
    if name not in ALLOWED_TOOLS:
        return f"错误: 不支持的工具 '{name}'，可用工具: {', '.join(ALLOWED_TOOLS)}"
    try:
        if name == "exec":
            return await _tool_exec(arguments)
        elif name == "read_file":
            return await _tool_read_file(arguments)
        elif name == "write_file":
            return await _tool_write_file(arguments)
        elif name == "list_dir":
            return await _tool_list_dir(arguments)
        elif name == "apply_patch":
            return await _tool_apply_patch(arguments)
    except Exception as e:
        return f"工具执行错误 ({name}): {str(e)}"


async def _tool_exec(arguments: dict) -> str:
    command = arguments.get("command", "")
    if not command:
        return "错误: 缺少 command 参数"
    cwd = arguments.get("cwd", "")
    if cwd:
        try:
            cwd_path = _validate_path(cwd)
        except ValueError as e:
            return str(e)
    else:
        cwd_path = TOOL_SANDBOX_DIR
    timeout = min(arguments.get("timeout", 30), 120)
    try:
        result = await asyncio.to_thread(
            subprocess.run,
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(cwd_path),
            env={**os.environ, "PATH": os.environ.get("PATH", "")},
        )
        output = ""
        if result.stdout:
            output += result.stdout
        if result.stderr:
            output += f"\nSTDERR:\n{result.stderr}"
        output += f"\n退出码: {result.returncode}"
        return output.strip()
    except subprocess.TimeoutExpired:
        return f"命令执行超时 ({timeout}s)"
    except Exception as e:
        return f"命令执行失败: {str(e)}"


async def _tool_read_file(arguments: dict) -> str:
    path = arguments.get("path", "")
    if not path:
        return "错误: 缺少 path 参数"
    try:
        target = _validate_path(path)
    except ValueError as e:
        return str(e)
    if not target.exists():
        return f"错误: 文件不存在: {path}"
    if not target.is_file():
        return f"错误: 不是文件: {path}"
    try:
        offset = arguments.get("offset", 0)
        limit = arguments.get("limit", 2000)
        content = await asyncio.to_thread(target.read_text, encoding="utf-8", errors="replace")
        lines = content.splitlines()
        if offset > 0:
            lines = lines[offset:]
        if limit > 0:
            lines = lines[:limit]
        return "\n".join(f"{i + offset + 1}\u2192{line}" for i, line in enumerate(lines))
    except Exception as e:
        return f"读取文件失败: {str(e)}"


async def _tool_write_file(arguments: dict) -> str:
    path = arguments.get("path", "")
    content = arguments.get("content", "")
    if not path:
        return "错误: 缺少 path 参数"
    try:
        target = _validate_path(path)
    except ValueError as e:
        return str(e)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(target.write_text, content, encoding="utf-8")
        return f"文件写入成功: {path} ({len(content)} 字符)"
    except Exception as e:
        return f"写入文件失败: {str(e)}"


async def _tool_list_dir(arguments: dict) -> str:
    path = arguments.get("path", "")
    if not path:
        path = "."
    try:
        target = _validate_path(path)
    except ValueError as e:
        return str(e)
    if not target.exists():
        return f"错误: 目录不存在: {path}"
    if not target.is_dir():
        return f"错误: 不是目录: {path}"
    try:
        entries = []
        for item in sorted(await asyncio.to_thread(lambda: list(target.iterdir()))):
            prefix = "DIR " if item.is_dir() else "FILE "
            size = ""
            if item.is_file():
                try:
                    size = f" ({item.stat().st_size} bytes)"
                except Exception:
                    pass
            entries.append(f"{prefix}{item.name}{size}")
        return "\n".join(entries) if entries else "(空目录)"
    except Exception as e:
        return f"列出目录失败: {str(e)}"


async def _tool_apply_patch(arguments: dict) -> str:
    path = arguments.get("path", "")
    patch = arguments.get("patch", "")
    if not path or not patch:
        return "错误: 缺少 path 或 patch 参数"
    try:
        target = _validate_path(path)
    except ValueError as e:
        return str(e)
    if not target.exists():
        return f"错误: 文件不存在: {path}"
    try:
        content = await asyncio.to_thread(target.read_text, encoding="utf-8", errors="replace")
        new_content = _apply_unified_diff(content, patch)
        if new_content is None:
            return "错误: 补丁应用失败，无法匹配原始内容"
        await asyncio.to_thread(target.write_text, new_content, encoding="utf-8")
        return f"补丁应用成功: {path}"
    except Exception as e:
        return f"应用补丁失败: {str(e)}"


def _apply_unified_diff(original: str, patch: str) -> Optional[str]:
    lines = original.splitlines(keepends=True)
    hunks = []
    current_hunk = None
    for line in patch.splitlines():
        if line.startswith("@@"):
            if current_hunk:
                hunks.append(current_hunk)
            match = re.match(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", line)
            if match:
                current_hunk = {
                    "old_start": int(match.group(1)),
                    "old_count": int(match.group(2) or 1),
                    "new_start": int(match.group(3)),
                    "new_count": int(match.group(4) or 1),
                    "lines": [],
                }
            else:
                current_hunk = None
        elif current_hunk is not None:
            current_hunk["lines"].append(line)
    if current_hunk:
        hunks.append(current_hunk)
    if not hunks:
        search = patch.strip()
        if search in original:
            return original
        return None
    result_lines = list(lines)
    offset = 0
    for hunk in hunks:
        start = hunk["old_start"] - 1 + offset
        old_lines = []
        new_lines = []
        for hline in hunk["lines"]:
            if hline.startswith("-"):
                old_lines.append(hline[1:])
            elif hline.startswith("+"):
                new_lines.append(hline[1:])
            elif hline.startswith(" "):
                old_lines.append(hline[1:])
                new_lines.append(hline[1:])
        for i, old_line in enumerate(old_lines):
            idx = start + i
            if idx < len(result_lines):
                stripped = result_lines[idx].rstrip("\n")
                if stripped != old_line.rstrip("\n"):
                    return None
        end = start + len(old_lines)
        new_lines_with_newline = [line + "\n" for line in new_lines]
        result_lines[start:end] = new_lines_with_newline
        offset += len(new_lines) - len(old_lines)
    return "".join(result_lines)


def parse_tool_calls_from_text(text: str) -> list[dict]:
    tools = []
    xml_pattern = r"<tool_call>tool_call\s*>\s*(.*?)\s*<\s*/\s*tool_call"
    for match in re.finditer(xml_pattern, text, re.DOTALL):
        try:
            call_data = json.loads(match.group(1).strip())
            tools.append(call_data)
        except Exception:
            pass
    marker = "\u25f0"
    marker_pattern = rf"{marker}(\w+)\s*\n(.*?)(?={marker}|$)"
    for match in re.finditer(marker_pattern, text, re.DOTALL):
        name = match.group(1)
        args_str = match.group(2).strip()
        try:
            args = json.loads(args_str)
        except Exception:
            args = {"raw": args_str}
        tools.append({"name": name, "arguments": args})
    return tools