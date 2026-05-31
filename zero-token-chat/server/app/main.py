from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routers import chat, cookies, models, tools

app = FastAPI(
    title="Zero Token Chat",
    description="使用浏览器 Cookie/Token 免费调用 DeepSeek 和 Qwen AI 模型的聊天应用",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(cookies.router)
app.include_router(models.router)
app.include_router(tools.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "zero-token-chat"}
