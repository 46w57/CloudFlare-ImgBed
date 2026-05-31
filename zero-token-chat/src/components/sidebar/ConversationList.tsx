import { Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatStore";

export default function ConversationList() {
  const { conversations, currentConversationId, setCurrentConversation, deleteConversation } =
    useChatStore();

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-[var(--text-secondary)]">
        暂无对话
      </div>
    );
  }

  const platformIcon = (platform: string) => {
    return platform === "deepseek" ? "🟢" : "🟣";
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
            conv.id === currentConversationId
              ? "bg-[var(--blue)]/10 text-[var(--blue)]"
              : "text-[var(--text)] hover:bg-[var(--border)]"
          )}
          onClick={() => setCurrentConversation(conv.id)}
        >
          <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
          <span className="flex-1 truncate text-sm">{conv.title}</span>
          <span className="text-xs opacity-60">{platformIcon(conv.platform)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteConversation(conv.id);
            }}
            className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-[var(--red)]/10 hover:text-[var(--red)] group-hover:opacity-100"
            title="删除对话"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
