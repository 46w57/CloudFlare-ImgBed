"""Provider 注册表。"""
from __future__ import annotations

from typing import Type

from app.core.cookie_store import get_cookie_store
from app.providers.base import BaseProvider

# 延迟导入避免循环
def _build_providers() -> dict[str, Type[BaseProvider]]:
    from app.providers.deepseek import DeepSeekProvider
    from app.providers.qwen import QwenProvider

    return {
        DeepSeekProvider.name: DeepSeekProvider,
        QwenProvider.name: QwenProvider,
    }


PROVIDER_REGISTRY: dict[str, Type[BaseProvider]] = _build_providers()


def get_provider(name: str) -> BaseProvider | None:
    """根据名称构造 provider 实例（自动注入当前 cookie 记录）。"""
    cls = PROVIDER_REGISTRY.get(name)
    if cls is None:
        return None
    record = get_cookie_store().get(name)
    return cls(cookie_record=record)


def list_providers() -> list[dict]:
    """列出所有支持的 provider 元信息（用于前端展示）。"""
    out = []
    store = get_cookie_store()
    for name, cls in PROVIDER_REGISTRY.items():
        status = store.status(name)
        out.append(
            {
                "name": name,
                "display_name": cls.display_name,
                "domains": cls.domains,
                "supports_expert_mode": cls.supports_expert_mode,
                "expert_mode_label": cls.expert_mode_label,
                "configured": status["configured"],
                "healthy": status.get("healthy", False),
            }
        )
    return out
