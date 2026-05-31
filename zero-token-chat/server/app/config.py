import os
from pathlib import Path

DATA_DIR = Path(os.path.expanduser("~/.zero-token-chat"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

CREDENTIALS_FILE = DATA_DIR / "credentials.enc"

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

DEEPSEEK_BASE_URL = "https://chat.deepseek.com"
QWEN_BASE_URL = "https://chat.qwen.ai"

DEEPSEEK_CHAT_ENDPOINT = "/api/v0/chat/completion"
DEEPSEEK_CREATE_ENDPOINT = "/api/v0/chat/create"

QWEN_CHAT_ENDPOINT = "/api/chat/completions"

POLL_INTERVAL = 2
POLL_MAX_DURATION = 300

TOOL_SANDBOX_DIR = DATA_DIR / "sandbox"
TOOL_SANDBOX_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_MODELS = {
    "deepseek-chat": {
        "platform": "deepseek",
        "display_name": "DeepSeek Chat",
        "thinking": True,
        "search": True,
        "tools": True,
    },
    "deepseek-reasoner": {
        "platform": "deepseek",
        "display_name": "DeepSeek Reasoner",
        "thinking": True,
        "search": False,
        "tools": True,
    },
    "qwen3-max": {
        "platform": "qwen",
        "display_name": "Qwen3 Max",
        "thinking": True,
        "search": True,
        "tools": True,
    },
    "qwen3-235b-a22b": {
        "platform": "qwen",
        "display_name": "Qwen3 235B-A22B (Thinking)",
        "thinking": True,
        "search": True,
        "tools": True,
    },
    "qwen-plus": {
        "platform": "qwen",
        "display_name": "Qwen Plus",
        "thinking": False,
        "search": True,
        "tools": True,
    },
    "qwen-turbo": {
        "platform": "qwen",
        "display_name": "Qwen Turbo",
        "thinking": False,
        "search": True,
        "tools": True,
    },
}
