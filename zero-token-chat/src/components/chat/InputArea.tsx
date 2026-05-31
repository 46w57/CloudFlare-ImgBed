import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Search, Brain, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useChat } from "@/hooks/useChat";

const MODEL_LABELS: Record<string, string> = {
  "deepseek-chat": "DeepSeek V4 Pro",
  "deepseek-reasoner": "DeepSeek Reasoner",
  "qwen3-max": "Qwen3 Max",
  "qwen3-235b-a22b": "Qwen3.7 Max",
  "qwen-plus": "Qwen Plus",
  "qwen-turbo": "Qwen Turbo",
};

export default function InputArea() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const { enableSearch, enableThinking, setEnableSearch, setEnableThinking } =
    useSettingsStore();
  const { handleSend } = useChat();

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming && input.trim()) {
          handleSend(input);
          setInput("");
        }
      }
    },
    [isStreaming, input, handleSend]
  );

  const handleSendClick = useCallback(() => {
    if (!isStreaming && input.trim()) {
      handleSend(input);
      setInput("");
    }
  }, [isStreaming, input, handleSend]);

  const modelLabel = currentConversation
    ? MODEL_LABELS[currentConversation.model] || currentConversation.model
    : MODEL_LABELS["deepseek-chat"]!;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 pb-4 pt-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-secondary)]">
          <span className="rounded bg-[var(--card)] border border-[var(--border)] px-2 py-0.5 font-mono">
            {modelLabel}
          </span>
        </div>
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2",
            "focus-within:border-[var(--blue)] focus-within:ring-1 focus-within:ring-[var(--blue)]",
            "transition-all duration-200"
          )}
        >
          <div className="flex items-center gap-1 self-end pb-0.5">
            <button
              onClick={() => setEnableSearch(!enableSearch)}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                enableSearch
                  ? "bg-[var(--blue)]/20 text-[var(--blue)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
              )}
              title="网页搜索"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => setEnableThinking(!enableThinking)}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                enableThinking
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
              )}
              title="深度思考"
            >
              <Brain className="h-4 w-4" />
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            disabled={isStreaming}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)]",
              "focus:outline-none disabled:opacity-50",
              "max-h-[200px]"
            )}
          />
          <button
            onClick={isStreaming ? undefined : handleSendClick}
            disabled={isStreaming || !input.trim()}
            className={cn(
              "rounded-lg p-2 transition-all duration-200",
              isStreaming
                ? "text-[var(--red)] hover:bg-[var(--red)]/10"
                : input.trim()
                ? "bg-[var(--blue)] text-white hover:opacity-90"
                : "text-[var(--text-secondary)]"
            )}
            title={isStreaming ? "生成中..." : "发送"}
          >
            {isStreaming ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-[var(--text-secondary)]">
          Zero Token Chat · 免费使用 AI 大模型
        </p>
      </div>
    </div>
  );
}
