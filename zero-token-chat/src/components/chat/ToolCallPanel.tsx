import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/store/chatStore";

interface ToolCallPanelProps {
  toolCalls: ToolCall[];
}

export default function ToolCallPanel({ toolCalls }: ToolCallPanelProps) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="my-2 space-y-2">
      {toolCalls.map((tc) => (
        <ToolCallItem key={tc.id} toolCall={tc} />
      ))}
    </div>
  );
}

function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    running: <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />,
    success: <CheckCircle2 className="h-4 w-4 text-[var(--green)]" />,
    error: <XCircle className="h-4 w-4 text-[var(--red)]" />,
  };

  const statusText = {
    running: "执行中",
    success: "成功",
    error: "失败",
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
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
        <Wrench className="h-4 w-4 shrink-0 text-orange-400" />
        <span className="font-medium font-mono">{toolCall.name}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {statusIcon[toolCall.status]}
          <span className="text-xs">{statusText[toolCall.status]}</span>
        </span>
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-2">
          {toolCall.arguments && (
            <div>
              <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">参数</div>
              <pre className="rounded bg-[var(--bg)] p-2 text-xs font-mono text-[var(--text)] overflow-x-auto">
                {toolCall.arguments}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <div className="mb-1 text-xs font-medium text-[var(--text-secondary)]">结果</div>
              <pre className="rounded bg-[var(--bg)] p-2 text-xs font-mono text-[var(--text)] overflow-x-auto whitespace-pre-wrap">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
