import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Brain, Search, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";

interface ModelOption {
  id: string;
  name: string;
  platform: "deepseek" | "qwen";
  capabilities?: ("thinking" | "search" | "tools")[];
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: "deepseek-chat", name: "DeepSeek V4 Pro", platform: "deepseek", capabilities: ["search", "tools"] },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner", platform: "deepseek", capabilities: ["thinking"] },
  { id: "qwen3-235b-a22b", name: "Qwen3.7 Max", platform: "qwen", capabilities: ["thinking", "tools"] },
  { id: "qwen3-max", name: "Qwen3 Max", platform: "qwen", capabilities: ["thinking", "search"] },
  { id: "qwen-plus", name: "Qwen Plus", platform: "qwen", capabilities: ["search"] },
  { id: "qwen-turbo", name: "Qwen Turbo", platform: "qwen" },
];

const PLATFORM_COLORS = {
  deepseek: "#10b981",
  qwen: "#8b5cf6",
} as const;

function PlatformDot({ platform }: { platform: "deepseek" | "qwen" }) {
  return (
    <span
      className="shrink-0 w-2 h-2 rounded-full"
      style={{
        backgroundColor: PLATFORM_COLORS[platform],
        boxShadow: `0 0 6px ${PLATFORM_COLORS[platform]}66`,
      }}
    />
  );
}

function CapabilityBadge({ type }: { type: "thinking" | "search" | "tools" }) {
  const config = {
    thinking: { icon: Brain, label: "思考", color: "text-[var(--amber)] bg-[var(--amber-muted)]" },
    search: { icon: Search, label: "搜索", color: "text-[var(--accent)] bg-[var(--accent-muted)]" },
    tools: { icon: Wrench, label: "工具", color: "text-[var(--emerald)] bg-[var(--emerald-muted)]" },
  };
  const { icon: Icon, color } = config[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1 py-0 text-[9px] font-medium leading-none",
        color
      )}
    >
      <Icon className="h-2.5 w-2.5" />
    </span>
  );
}

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

  const deepseekModels = MODEL_OPTIONS.filter((m) => m.platform === "deepseek");
  const qwenModels = MODEL_OPTIONS.filter((m) => m.platform === "qwen");

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
          open
            ? "border-[var(--accent)]/50 bg-[var(--accent-muted)] text-[var(--text-primary)]"
            : "border-[var(--border-default)] bg-[var(--bg-tertiary)]/60 text-[var(--text-secondary)] hover:border-[var(--card-hover-border)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
        )}
      >
        <PlatformDot platform={currentModel.platform} />
        <span className="flex-1 text-left truncate">{currentModel.name}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-180 text-[var(--accent)]"
          )}
        />
      </button>

      {/* Dropdown */}
      <div
        className={cn(
          "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border shadow-lg transition-all duration-200 origin-top",
          open
            ? "opacity-100 translate-y-0 scale-y-100"
            : "opacity-0 -translate-y-2 scale-y-95 pointer-events-none"
        )}
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-elevated)",
          backdropFilter: "blur(20px)",
          boxShadow: "var(--shadow-lg), var(--shadow-glow)",
        }}
      >
        {/* DeepSeek Group */}
        <div className="py-1.5">
          <div className="px-3 pb-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <PlatformDot platform="deepseek" />
              DeepSeek
            </div>
          </div>
          {deepseekModels.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left transition-all duration-150",
                model.id === currentModel.id
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              <PlatformDot platform={model.platform} />
              <span className="flex-1 truncate text-sm">{model.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                {model.capabilities?.map((cap) => (
                  <CapabilityBadge key={cap} type={cap} />
                ))}
              </div>
              {model.id === currentModel.id && (
                <Check className="h-3.5 w-3.5 shrink-0 animate-fade-in" />
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-[var(--border-subtle)]" />

        {/* Qwen Group */}
        <div className="py-1.5">
          <div className="px-3 pb-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <PlatformDot platform="qwen" />
              Qwen
            </div>
          </div>
          {qwenModels.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left transition-all duration-150",
                model.id === currentModel.id
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              <PlatformDot platform={model.platform} />
              <span className="flex-1 truncate text-sm">{model.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                {model.capabilities?.map((cap) => (
                  <CapabilityBadge key={cap} type={cap} />
                ))}
              </div>
              {model.id === currentModel.id && (
                <Check className="h-3.5 w-3.5 shrink-0 animate-fade-in" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
