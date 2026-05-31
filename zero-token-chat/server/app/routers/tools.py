from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.tool_executor import execute_tool

router = APIRouter(prefix="/api/tools", tags=["tools"])


class ToolExecuteRequest(BaseModel):
    name: Optional[str] = None
    tool: Optional[str] = None
    arguments: Optional[dict] = None
    args: Optional[dict] = None


@router.post("/execute")
async def execute_tool_endpoint(request: ToolExecuteRequest):
    tool_name = request.name or request.tool
    tool_args = request.arguments or request.args or {}

    if not tool_name:
        raise HTTPException(status_code=400, detail="工具名称不能为空")

    result = await execute_tool(tool_name, tool_args)
    return {"name": tool_name, "result": result}
