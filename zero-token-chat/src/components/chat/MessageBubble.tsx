import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/store/chatStore";
import ThinkingPanel from "./ThinkingPanel";
import ToolCallPanel from "./ToolCallPanel";
import SearchPanel from "./SearchPanel";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-[var(--blue)] text-white"
            : "bg-[var(--border)] text-[var(--text)]"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "min-w-0 max-w-[80%] space-y-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-[var(--blue)] px-4 py-2.5 text-white">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
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
              <div className="prose-chat rounded-2xl rounded-tl-sm bg-[var(--card)] px-4 py-2.5 text-[var(--text)]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    pre: ({ children }) => (
                      <pre className="relative group my-2 overflow-x-auto rounded-lg bg-[var(--bg)] p-3 text-sm">
                        {children}
                      </pre>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code
                            className="rounded bg-[var(--border)] px-1.5 py-0.5 text-xs font-mono"
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
                        className="text-[var(--blue)] hover:underline"
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="my-2 overflow-x-auto rounded-lg border border-[var(--border)]">
                        <table className="min-w-full">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border-b border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-sm font-medium">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border-b border-[var(--border)] px-3 py-2 text-sm">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
            {isStreaming && !message.content && !message.thinkingContent && (
              <div className="flex items-center gap-1 px-4 py-2">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)] [animation-delay:-0.3s]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)] [animation-delay:-0.15s]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)]" />
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
        className="absolute right-2 top-2 rounded-md bg-[var(--border)] p-1.5 text-[var(--text-secondary)] opacity-0 transition-opacity hover:bg-[var(--card)] group-hover:opacity-100"
        title="复制代码"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[var(--green)]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <code className={cn("text-sm font-mono", className)}>{children}</code>
    </div>
  );
}
