"""工具调用测试。"""
from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

from app.tools.builtin import (
    ExecTool,
    ListDirTool,
    ReadFileTool,
    ToolContext,
    WriteFileTool,
    get_tool_registry,
)


async def run():
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        ctx = ToolContext(workspace=td)
        reg = get_tool_registry(ctx)
        # write
        r = await reg["write_file"].run(path="hello.txt", content="hi\nworld\n")
        assert "已写入" in r
        # read
        r = await reg["read_file"].run(path="hello.txt")
        assert "hi" in r and "world" in r
        # list
        r = await reg["list_dir"].run(path=".")
        assert "hello.txt" in r
        # exec - safe
        r = await reg["exec"].run(command="echo hello")
        assert "hello" in r
        # exec - dangerous
        r = await reg["exec"].run(command="rm -rf /")
        assert "拒绝" in r
    print("tools tests passed")


if __name__ == "__main__":
    asyncio.run(run())
