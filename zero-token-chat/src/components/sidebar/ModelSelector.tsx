import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatStore";

import { useSettingsStore } from "@/store/settingsStore";

interface ModelOption {
  id: string;
  name: string;
  platform: "deepseek" | "qwen";
  icon: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: "deepseek-chat", name: "DeepSeek V4 Pro", platform: "deepseek", icon: "🟢" },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner", platform: "deepseek", icon: "🟢" },
  { id: "qwen3-235b-a22b", name: "Qwen3.7 Max", platform: "qwen", icon: "🟣" },
  { id: "qwen3-max", name: "Qwen3 Max", platform: "qwen", icon: "🟣" },
  { id: "qwen-plus", name: "Qwen Plus", platform: "qwen", icon: "🟣" },
  { id: "qwen-turbo", name: "Qwen Turbo", platform: "qwen", icon: "🟣" },
];

export default function ModelSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { conversations, currentConversationId, createConversation } = useChatStore();
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  const currentModel = currentConversation
    ? MODEL_OPTIONS.find(
        (m) => m.platform === currentConversation.platform && m.id === currentConversation.model
      ) || MODEL_OPTIONS[0]
    : MODEL_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (model: ModelOption) => {
    setSelectedModel(model.id);
    createConversation(model.platform, model.id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2",
          "text-sm text-[var(--text)] transition-colors hover:bg-[var(--border)]"
        )}
      >
        <span>{currentModel.icon}</span>
        <span className="flex-1 text-left truncate">{currentModel.name}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--text-secondary)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
          {MODEL_OPTIONS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                model.id === currentModel.id
                  ? "bg-[var(--blue)]/10 text-[var(--blue)]"
                  : "text-[var(--text)] hover:bg-[var(--border)]"
              )}
            >
              <span>{model.icon}</span>
              <span>{model.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
