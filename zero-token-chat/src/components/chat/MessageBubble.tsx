import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/store/chatStore";
import ThinkingPanel from "./ThinkingPanel";
import ToolCallPanel from "./ToolCallPanel";
import SearchPanel from "./SearchPanel";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-1 py-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold select-none mt-0.5",
          isUser
            ? "text-white"
            : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--accent)]"
        )}
        style={
          isUser
            ? { background: "linear-gradient(135deg, var(--accent), #0ea5e9)" }
            : undefined
        }
      >
        {isUser ? (
          <span>U</span>
        ) : (
          <Bot className="h-4.5 w-4.5" />
        )}
      </div>

      <div
        className={cn(
          "min-w-0 max-w-[78%] space-y-1.5",
          isUser ? "items-end" : "items-start"
        )}
      >
        {isUser ? (
          <>
            <div
              className="rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed text-white shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(6,182,212,0.85), rgba(14,165,233,0.75))",
                backdropFilter: "blur(8px)",
              }}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <span className={cn("block text-[10px] text-[var(--text-muted)]", isUser && "text-right pr-1")}>
              {formatTime(message.createdAt)}
            </span>
          </>
        ) : (
          <div className="space-y-2">
            {message.thinkingContent && (
              <ThinkingPanel content={message.thinkingContent} isStreaming={isStreaming} />
            )}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCallPanel toolCalls={message.toolCalls} />
            )}
            {message.searchResults && message.searchResults.length > 0 && (
              <SearchPanel searchResults={message.searchResults} />
            )}
            {message.content && (
              <div className="prose-chat rounded-2xl rounded-tl-sm bg-[var(--card-bg)] border border-[var(--card-border)] px-4 py-3 text-[var(--text-primary)] backdrop-blur-sm shadow-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    pre: ({ children }) => (
                      <pre className="relative group my-2 overflow-x-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-sm border border-[var(--border-subtle)]">
                        {children}
                      </pre>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code
                            className="rounded px-1.5 py-0.5 text-xs font-mono text-[var(--accent-hover)]"
                            style={{ background: "var(--accent-muted)" }}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <CodeBlock className={className}>{children}</CodeBlock>
                      );
                    },
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150"
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="my-2 overflow-x-auto rounded-lg border border-[var(--border-default)]">
                        <table className="min-w-full">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 text-left text-sm font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border-b border-[var(--border-default)] px-3 py-2 text-sm">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
            {(message.content || message.thinkingContent || message.toolCalls?.length) && (
              <span className="block text-[10px] text-[var(--text-muted)] pl-1">
                {formatTime(message.createdAt)}
              </span>
            )}
            {isStreaming && !message.content && !message.thinkingContent && (
              <div className="flex items-center gap-1.5 px-4 py-2">
                <span className="bounce-dot inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span className="bounce-dot animate-bounce-delay-1 inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span className="bounce-dot animate-bounce-delay-2 inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, "");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[var(--text-secondary)] opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] group-hover:opacity-100"
        title="复制代码"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-[var(--emerald)]" />
            <span className="text-[10px]">已复制</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            <span className="text-[10px]">复制</span>
          </>
        )}
      </button>
      <code className={cn("text-sm font-mono", className)}>{children}</code>
    </div>
  );
}
