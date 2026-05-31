import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingPanelProps {
  content: string;
  isStreaming?: boolean;
}

export default function ThinkingPanel({ content, isStreaming }: ThinkingPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-[var(--amber-muted)] bg-[var(--card-bg)] backdrop-blur-sm shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors duration-200",
          "hover:bg-[var(--amber-muted)]/40"
        )}
      >
        <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <div
            className="absolute inset-y-0 left-0 w-[2px] rounded-full"
            style={{
              background:
                "linear-gradient(180deg, var(--amber) 0%, transparent 100%)",
            }}
          />
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 ml-1 text-[var(--amber)]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 ml-1 text-[var(--amber)]" />
          )}
        </div>
        <Brain className="h-4 w-4 shrink-0 text-[var(--amber)]" />
        <span className="font-medium text-[var(--amber)]">思考过程</span>
        {isStreaming && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse-soft"
              style={{ background: "var(--amber)", boxShadow: "0 0 6px var(--amber-muted)" }}
            />
            <span className="text-xs font-medium text-[var(--amber)]">思考中...</span>
          </span>
        )}
        {!isStreaming && (
          <span className="ml-auto text-[10px] text-[var(--text-muted)]">
            {content.length > 100 ? `${Math.ceil(content.length / 2)} 字` : "已结束"}
          </span>
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div
          className="border-t border-[var(--amber-muted)] px-4 py-3"
          style={{
            background: "linear-gradient(180deg, var(--amber-muted)/20 0%, transparent 100%)",
          }}
        >
          <pre
            className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono italic"
            style={{ color: "rgba(245, 158, 11, 0.75)" }}
          >
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
