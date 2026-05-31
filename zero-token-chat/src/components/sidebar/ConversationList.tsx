import { Trash2, MessageSquare, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatStore";

const PLATFORM_DOT: Record<string, string> = {
  deepseek: "#10b981",
  qwen: "#8b5cf6",
};

export default function ConversationList() {
  const { conversations, currentConversationId, setCurrentConversation, deleteConversation } =
    useChatStore();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-10 text-center animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">暂无对话</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">点击上方按钮开始新对话</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-px min-h-0">
      {conversations.map((conv) => (
        <ConversationRow
          key={conv.id}
          conversation={conv}
          isActive={conv.id === currentConversationId}
          onSelect={() => setCurrentConversation(conv.id)}
          onDelete={(e) => {
            e.stopPropagation();
            deleteConversation(conv.id);
          }}
        />
      ))}
    </div>
  );
}

function ConversationRow({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: {
  conversation: {
    id: string;
    title: string;
    platform: "deepseek" | "qwen";
  };
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const dotColor = PLATFORM_DOT[conversation.platform] ?? "var(--text-muted)";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-lg py-2 pl-3 pr-2 text-left transition-all duration-200",
        isActive
          ? "bg-[var(--accent-muted)]"
          : "hover:bg-[var(--bg-tertiary)]/60"
      )}
    >
      {/* Active left border */}
      <span
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-full transition-all duration-200",
          isActive
            ? "bg-[var(--accent)] opacity-100 shadow-sm"
            : "bg-transparent opacity-0 group-hover:bg-[var(--accent)]/30"
        )}
      />

      {/* Platform dot */}
      <span
        className="shrink-0 h-2 w-2 rounded-full transition-shadow duration-200"
        style={{
          backgroundColor: dotColor,
          boxShadow: isActive ? `0 0 6px ${dotColor}88` : `0 0 4px ${dotColor}33`,
        }}
      />

      {/* Title */}
      <span
        className={cn(
          "flex-1 truncate text-sm leading-snug transition-colors duration-200",
          isActive
            ? "text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
        )}
      >
        {conversation.title}
      </span>

      {/* Delete button — slides in from right on hover */}
      <span
        className={cn(
          "shrink-0 overflow-hidden transition-all duration-200 ease-out",
          "max-w-0 opacity-0 group-hover:max-w-[28px] group-hover:opacity-100"
        )}
      >
        <button
          onClick={onDelete}
          className={cn(
            "flex items-center justify-center rounded-md p-1",
            "text-[var(--text-muted)] transition-colors duration-150",
            "hover:bg-[var(--rose-muted)] hover:text-[var(--rose)]"
          )}
          title="删除对话"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </span>
    </button>
  );
}
