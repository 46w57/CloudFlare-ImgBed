import { Plus, Cookie, Settings, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useNavigate, useLocation } from "react-router-dom";
import ModelSelector from "./ModelSelector";
import ConversationList from "./ConversationList";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { createConversation } = useChatStore();
  const selectedModel = useSettingsStore((s) => s.selectedModel);

  const handleNewChat = () => {
    const platform = selectedModel.startsWith("qwen") ? "qwen" as const : "deepseek" as const;
    createConversation(platform, selectedModel);
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-[var(--border)] bg-[var(--card)] transition-all duration-300",
        collapsed ? "w-0 overflow-hidden opacity-0" : "w-[260px] opacity-100"
      )}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-3">
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
          title="收起侧边栏"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
        <ModelSelector />
      </div>

      <div className="px-3 py-2">
        <button
          onClick={handleNewChat}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2",
            "text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--blue)] hover:text-[var(--blue)] hover:bg-[var(--blue)]/5"
          )}
        >
          <Plus className="h-4 w-4" />
          <span>新对话</span>
        </button>
      </div>

      <ConversationList />

      <div className="border-t border-[var(--border)] px-3 py-2 space-y-0.5">
        <button
          onClick={() => navigate("/cookies")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            location.pathname === "/cookies"
              ? "bg-[var(--blue)]/10 text-[var(--blue)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
          )}
        >
          <Cookie className="h-4 w-4" />
          <span>凭证管理</span>
        </button>
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            location.pathname === "/settings"
              ? "bg-[var(--blue)]/10 text-[var(--blue)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
          )}
        >
          <Settings className="h-4 w-4" />
          <span>设置</span>
        </button>
      </div>
    </aside>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
      title="展开侧边栏"
    >
      <PanelLeft className="h-5 w-5" />
    </button>
  );
}
