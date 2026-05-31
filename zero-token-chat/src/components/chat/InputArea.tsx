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

  const canSend = !isStreaming && input.trim().length > 0;

  return (
    <div className="border-t border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl px-4 pb-5 pt-3">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-2xl border bg-[var(--card-bg)] px-4 py-3 transition-all duration-200",
            "backdrop-blur-xl shadow-md",
            "border-[var(--card-border)]",
            "focus-within:border-[var(--accent)] focus-within:shadow-lg focus-within:shadow-[var(--accent-glow)]"
          )}
          style={{
            boxShadow: "var(--shadow-sm), var(--shadow-glow)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            disabled={isStreaming}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "focus:outline-none disabled:opacity-50",
              "max-h-[200px] py-1"
            )}
          />
          <button
            onClick={isStreaming ? undefined : handleSendClick}
            disabled={!canSend}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200",
              canSend
                ? "text-white cursor-pointer"
                : "cursor-not-allowed opacity-30"
            )}
            style={
              canSend
                ? {
                    background: "linear-gradient(135deg, var(--accent), #0ea5e9)",
                    boxShadow: "0 0 12px var(--accent-glow)",
                  }
                : {
                    background: "var(--bg-tertiary)",
                  }
            }
            title={isStreaming ? "生成中..." : "发送"}
          >
            {isStreaming ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2.5 py-0.5 text-[11px] font-medium font-mono text-[var(--text-secondary)]"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" />
              {modelLabel}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setEnableSearch(!enableSearch)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150",
                  enableSearch
                    ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                )}
                title="网页搜索"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setEnableThinking(!enableThinking)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150",
                  enableThinking
                    ? "text-[var(--amber)] bg-[var(--amber-muted)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                )}
                title="深度思考"
              >
                <Brain className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            Shift+Enter 换行
          </span>
        </div>
      </div>
    </div>
  );
}
