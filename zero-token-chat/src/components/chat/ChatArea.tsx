import { useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import MessageBubble from "./MessageBubble";

export default function ChatArea() {
  const { conversations, currentConversationId, isStreaming } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages, isStreaming]);

  if (!currentConversation || currentConversation.messages.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl py-4">
        {currentConversation.messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={
              isStreaming &&
              idx === currentConversation.messages.length - 1 &&
              msg.role === "assistant"
            }
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--card)] border border-[var(--border)]">
          <MessageSquare className="h-8 w-8 text-[var(--blue)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text)]">Zero Token Chat</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">
          免费使用 DeepSeek 和 Qwen 大模型，无需 API Token。
          <br />
          选择模型，开始对话吧！
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {["解释量子计算", "写一个 Python 快速排序", "帮我分析这段代码"].map(
            (hint) => (
              <span
                key={hint}
                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--text-secondary)] cursor-default"
              >
                {hint}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
