import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/store/chatStore";

interface ToolCallPanelProps {
  toolCalls: ToolCall[];
}

const STATUS_CONFIG = {
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    text: "执行中",
    borderColor: "var(--amber)",
    bgMuted: "var(--amber-muted)",
    textColor: "var(--amber)",
    badgeClass: "animate-pulse-soft",
  },
  success: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    text: "成功",
    borderColor: "var(--emerald)",
    bgMuted: "var(--emerald-muted)",
    textColor: "var(--emerald)",
    badgeClass: "",
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    text: "失败",
    borderColor: "var(--rose)",
    bgMuted: "var(--rose-muted)",
    textColor: "var(--rose)",
    badgeClass: "",
  },
};

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
  const config = STATUS_CONFIG[toolCall.status];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-l-[3px] bg-[var(--card-bg)] backdrop-blur-sm shadow-sm transition-all duration-200",
        "hover:shadow-md"
      )}
      style={{
        borderLeftColor: config.borderColor,
        borderColor: `transparent transparent transparent ${config.borderColor}`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors duration-200",
        )}
        style={{ "--hover-bg": config.bgMuted } as React.CSSProperties}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${config.bgMuted}/30`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        )}
        <Wrench className="h-4 w-4 shrink-0" style={{ color: config.textColor }} />
        <span className="font-mono font-medium text-sm text-[var(--text-primary)] truncate max-w-[180px]">
          {toolCall.name}
        </span>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            config.badgeClass
          )}
          style={{
            background: `${config.bgMuted}`,
            color: config.textColor,
            boxShadow: toolCall.status === "running"
              ? `0 0 8px ${config.bgMuted}`
              : undefined,
          }}
        >
          <span style={{ color: config.textColor }}>{config.icon}</span>
          {config.text}
        </span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div
          className="border-t border-[var(--border-subtle)] px-4 py-3 space-y-3"
          style={{
            background: `linear-gradient(180deg, ${config.bgMuted}/15 0%, transparent 100%)`,
          }}
        >
          {toolCall.arguments && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  输入参数
                </span>
              </div>
              <pre
                className="overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs font-mono leading-relaxed text-[var(--text-secondary)]"
              >
                {typeof toolCall.arguments === "string"
                  ? toolCall.arguments
                  : JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  返回结果
                </span>
              </div>
              <pre
                className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs font-mono leading-relaxed text-[var(--text-secondary)]"
              >
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
