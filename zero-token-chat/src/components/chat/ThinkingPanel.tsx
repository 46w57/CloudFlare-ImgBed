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
    <div className="my-2 rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
          "hover:bg-[var(--border)] text-[var(--text-secondary)]"
        )}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Brain className="h-4 w-4 shrink-0 text-purple-400" />
        <span className="font-medium">思考过程</span>
        {isStreaming && (
          <span className="ml-auto flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
            <span className="text-xs text-purple-400">思考中...</span>
          </span>
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="text-sm italic text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
