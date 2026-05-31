from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.tool_executor import execute_tool

router = APIRouter(prefix="/api/tools", tags=["tools"])


class ToolExecuteRequest(BaseModel):
    name: str
    arguments: dict


@router.post("/execute")
async def execute_tool_endpoint(request: ToolExecuteRequest):
    result = await execute_tool(request.name, request.arguments)
    return {"name": request.name, "result": result}
