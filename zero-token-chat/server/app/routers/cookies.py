import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.credential_store import save_credential, load_credential, delete_credential, list_credentials
from app.services.auto_extractor import start_login_poll, get_poll_status, auto_detect

router = APIRouter(prefix="/api/cookies", tags=["cookies"])


class ManualImportRequest(BaseModel):
    platform: str
    token: str
    cookies: Optional[str] = ""


class ValidateRequest(BaseModel):
    platform: str
    token: str
    cookies: Optional[str] = ""


class StartLoginRequest(BaseModel):
    platform: str


class AutoDetectRequest(BaseModel):
    platform: str


@router.post("/start-login")
async def start_login(request: StartLoginRequest):
    if request.platform not in ("deepseek", "qwen"):
        raise HTTPException(status_code=400, detail="不支持的平台，仅支持 deepseek 和 qwen")

    task_id = await start_login_poll(request.platform)
    return {"task_id": task_id, "status": "polling", "message": "已打开浏览器，请在浏览器中登录"}


@router.get("/poll/{task_id}")
async def poll_status(task_id: str):
    status = get_poll_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="任务不存在")
    return status


@router.post("/auto-detect")
async def auto_detect_credentials(request: AutoDetectRequest):
    if request.platform not in ("deepseek", "qwen"):
        raise HTTPException(status_code=400, detail="不支持的平台，仅支持 deepseek 和 qwen")

    result = await auto_detect(request.platform)
    if not result:
        return {"found": False, "message": "未检测到浏览器凭证，请手动导入或登录"}

    save_credential(result["platform"], result["token"], result.get("cookies", ""))
    return {"found": True, "credential": result}


@router.post("/manual")
async def manual_import(request: ManualImportRequest):
    if request.platform not in ("deepseek", "qwen"):
        raise HTTPException(status_code=400, detail="不支持的平台，仅支持 deepseek 和 qwen")

    if not request.token:
        raise HTTPException(status_code=400, detail="token 不能为空")

    save_credential(request.platform, request.token, request.cookies)
    return {"success": True, "message": f"{request.platform} 凭证已保存"}


@router.get("")
async def list_all_credentials():
    store = list_credentials()
    result = {}
    for platform, cred in store.items():
        result[platform] = {
            "platform": platform,
            "has_token": bool(cred.get("token")),
            "has_cookies": bool(cred.get("cookies")),
            "token_preview": cred.get("token", "")[:8] + "..." if cred.get("token") else "",
        }
    return result


@router.post("/validate")
async def validate_credential(request: ValidateRequest):
    if request.platform not in ("deepseek", "qwen"):
        raise HTTPException(status_code=400, detail="不支持的平台，仅支持 deepseek 和 qwen")

    import httpx
    from app.config import DEEPSEEK_BASE_URL, QWEN_BASE_URL

    if request.platform == "deepseek":
        headers = {
            "Authorization": f"Bearer {request.token}",
            "Content-Type": "application/json",
        }
        if request.cookies:
            headers["Cookie"] = request.cookies
        try:
            async with httpx.AsyncClient(base_url=DEEPSEEK_BASE_URL, timeout=15) as client:
                resp = await client.get("/api/v0/chat/list", headers=headers)
                if resp.status_code == 200:
                    return {"valid": True, "message": "DeepSeek 凭证有效"}
                elif resp.status_code == 401:
                    return {"valid": False, "message": "DeepSeek token 已过期或无效"}
                else:
                    return {"valid": False, "message": f"验证失败: HTTP {resp.status_code}"}
        except Exception as e:
            return {"valid": False, "message": f"连接失败: {str(e)}"}
    else:
        headers = {
            "Authorization": f"Bearer {request.token}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(base_url=QWEN_BASE_URL, timeout=15) as client:
                resp = await client.get("/api/me", headers=headers)
                if resp.status_code == 200:
                    return {"valid": True, "message": "Qwen 凭证有效"}
                elif resp.status_code == 401:
                    return {"valid": False, "message": "Qwen token 已过期或无效"}
                else:
                    return {"valid": False, "message": f"验证失败: HTTP {resp.status_code}"}
        except Exception as e:
            return {"valid": False, "message": f"连接失败: {str(e)}"}


@router.delete("/{platform}")
async def delete_credential_endpoint(platform: str):
    if platform not in ("deepseek", "qwen"):
        raise HTTPException(status_code=400, detail="不支持的平台，仅支持 deepseek 和 qwen")

    deleted = delete_credential(platform)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"未找到 {platform} 的凭证")
    return {"success": True, "message": f"{platform} 凭证已删除"}
