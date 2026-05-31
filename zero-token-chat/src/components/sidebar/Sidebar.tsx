import { Plus, Cookie, Settings, PanelLeftClose, PanelLeft, Zap } from "lucide-react";
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
        "relative flex h-full flex-col transition-all duration-300 ease-out",
        collapsed ? "w-0 overflow-hidden opacity-0" : "w-[272px] opacity-100"
      )}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
        style={{
          background:
            "linear-gradient(180deg, var(--accent) 0%, rgba(6,182,212,0.4) 40%, transparent 100%)",
        }}
      />

      <div
        className={cn(
          "relative flex h-full flex-col",
          "bg-[var(--bg-secondary)]/80 backdrop-blur-xl",
          "border-r border-[var(--border-default)]"
        )}
      >
        {/* Header — Model Selector + Toggle */}
        <div className="flex items-center gap-2.5 px-3 pt-3 pb-2.5 border-b border-[var(--border-subtle)]">
          <button
            onClick={onToggle}
            className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
            title="收起侧边栏"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="status-dot status-dot-success shrink-0" />
            <ModelSelector />
          </div>
        </div>

        {/* New Chat Pill */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={handleNewChat}
            className={cn(
              "group relative flex w-full items-center justify-center gap-2",
              "rounded-full px-4 py-2 text-sm font-medium",
              "bg-gradient-to-r from-[var(--accent)] to-[#0ea5e9]",
              "text-white shadow-md shadow-[var(--accent-glow)]",
              "transition-all duration-200 ease-out",
              "hover:shadow-lg hover:shadow-[var(--accent-glow)] hover:brightness-110",
              "active:scale-[0.97] active:brightness-95",
              "overflow-hidden"
            )}
          >
            <span
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, transparent 70%)",
              }}
            />
            <Plus className="h-4 w-4 relative z-10" />
            <span className="relative z-10">新对话</span>
          </button>
        </div>

        {/* Conversation List */}
        <ConversationList />

        {/* Nav Links */}
        <nav className="border-t border-[var(--border-subtle)] px-2 pt-1.5 pb-1 space-y-0.5">
          <NavItem
            icon={<Cookie className="h-4 w-4" />}
            label="凭证管理"
            active={location.pathname === "/cookies"}
            onClick={() => navigate("/cookies")}
          />
          <NavItem
            icon={<Settings className="h-4 w-4" />}
            label="设置"
            active={location.pathname === "/settings"}
            onClick={() => navigate("/settings")}
          />
        </nav>

        {/* Footer Branding */}
        <div className="mt-auto px-4 pb-3 pt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <Zap className="h-3 w-3 text-[var(--accent)]" />
            <span>Zero Token Chat</span>
            <span className="ml-auto font-mono">v1.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
        active
          ? "text-[var(--accent)] bg-[var(--accent-muted)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent)]"
        />
      )}
      <span className={cn("transition-colors", active && "text-[var(--accent)]")}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
      title="展开侧边栏"
    >
      <PanelLeft className="h-5 w-5" />
    </button>
  );
}
