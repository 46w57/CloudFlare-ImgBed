from fastapi import APIRouter

from app.config import SUPPORTED_MODELS

router = APIRouter(prefix="/api", tags=["models"])


@router.get("/models")
async def list_models():
    models = []
    for model_id, info in SUPPORTED_MODELS.items():
        models.append({
            "id": model_id,
            "platform": info["platform"],
            "display_name": info["display_name"],
            "capabilities": {
                "thinking": info.get("thinking", False),
                "search": info.get("search", False),
                "tools": info.get("tools", False),
            },
        })
    return {"models": models}
