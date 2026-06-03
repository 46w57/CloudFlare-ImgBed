"""Provider 适配器集合。"""
from app.providers.base import (
    BaseProvider,
    ChatMessage,
    ChatRequest,
    ChatChunk,
    ToolSpec,
)
from app.providers.deepseek import DeepSeekProvider
from app.providers.qwen import QwenProvider
from app.providers.registry import (
    PROVIDER_REGISTRY,
    get_provider,
    list_providers,
)

__all__ = [
    "BaseProvider",
    "ChatMessage",
    "ChatRequest",
    "ChatChunk",
    "ToolSpec",
    "DeepSeekProvider",
    "QwenProvider",
    "PROVIDER_REGISTRY",
    "get_provider",
    "list_providers",
]
