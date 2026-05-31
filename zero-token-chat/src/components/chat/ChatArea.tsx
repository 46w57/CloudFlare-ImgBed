import { useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useChat } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";

const SUGGESTED_PROMPTS = [
  "解释量子计算的基本原理",
  "写一个 Python 快速排序算法",
  "帮我分析这段代码的性能瓶颈",
  "用通俗易懂的方式解释机器学习",
];

export default function ChatArea() {
  const { conversations, currentConversationId, isStreaming } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );
  const { handleSend } = useChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages, isStreaming]);

  if (!currentConversation || currentConversation.messages.length === 0) {
    return <WelcomeScreen onPromptClick={handleSend} />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
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

function WelcomeScreen({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute top-1/3 -left-20 w-[300px] h-[300px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 60%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="absolute bottom-1/4 -right-16 w-[250px] h-[250px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%)",
            filter: "blur(45px)",
          }}
        />
      </div>

      <div className="relative z-10 text-center space-y-8 animate-fade-in">
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, var(--accent) 0%, #0ea5e9 50%, #8b5cf6 100%)",
              boxShadow: "0 0 40px var(--accent-glow), 0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <Sparkles className="h-10 w-10 text-white" />
            <div
              className="absolute inset-0 rounded-2xl opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                animation: "shimmer 3s ease-in-out infinite",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
          <div className="space-y-2">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--accent) 0%, #67e8f9 50%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Zero Token Chat
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              免费使用 DeepSeek 和 Qwen 大模型，无需 API Token。
              <br />
              选择模型，开始对话吧！
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPromptClick(prompt)}
              className="group relative cursor-pointer rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] backdrop-blur-sm transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent-glow)] hover:-translate-y-0.5"
            >
              <span className="relative z-10">{prompt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
