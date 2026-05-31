import { useState } from "react";
import {
  Key,
  Check,
  Trash2,
  ExternalLink,
  ScanSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CredentialInfo, PollingStatus } from "@/store/cookieStore";

interface CredentialCardProps {
  platform: "deepseek" | "qwen";
  credential: CredentialInfo;
  pollingStatus: PollingStatus;
  onStartLogin: () => void;
  onAutoDetect: () => void;
  onManualImport: (token: string) => void;
  onValidate: () => void;
  onDelete: () => void;
}

export default function CredentialCard({
  platform,
  credential,
  pollingStatus,
  onStartLogin,
  onAutoDetect,
  onManualImport,
  onValidate,
  onDelete,
}: CredentialCardProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState("");

  const isDeepseek = platform === "deepseek";
  const platformName = isDeepseek ? "DeepSeek" : "Qwen";
  const platformUrl = isDeepseek ? "chat.deepseek.com" : "chat.qwen.ai";

  const platformConfig = {
    deepseek: {
      color: "#10b981",
      colorVar: "var(--emerald)",
      mutedBg: "var(--emerald-muted)",
    },
    qwen: {
      color: "#8b5cf6",
      colorVar: "#8b5cf6",
      mutedBg: "rgba(139, 92, 246, 0.15)",
    },
  };

  const pc = platformConfig[platform];

  const statusConfig = {
    valid: { dotClass: "status-dot-success", label: "已配置" },
    expired: { dotClass: "status-dot-error", label: "已过期" },
    unknown: { dotClass: "status-dot-warning", label: "未知" },
    empty: { dotClass: "", label: "未配置" },
  };

  const status = statusConfig[credential.status];

  const pollingConfig: Record<PollingStatus, { text: string; type: "idle" | "loading" | "success" | "error" }> = {
    idle: { text: "", type: "idle" },
    polling: { text: "正在检测浏览器凭证...", type: "loading" },
    found: { text: "已找到凭证！", type: "success" },
    timeout: { text: "检测超时，请尝试手动导入", type: "error" },
    error: { text: "检测失败，请尝试手动导入", type: "error" },
  };

  const currentPolling = pollingConfig[pollingStatus];
  const isPolling = pollingStatus === "polling";

  const handleManualSubmit = () => {
    if (manualToken.trim()) {
      onManualImport(manualToken.trim());
      setManualToken("");
      setShowManualInput(false);
    }
  };

  return (
    <div
      className={cn(
        "card-glass hover-lift overflow-hidden relative",
        isPolling && "animate-pulse-soft"
      )}
      style={{
        borderTopWidth: 3,
        borderTopColor: pc.color,
        borderTopStyle: "solid",
      }}
    >
      {isPolling && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${pc.color}, transparent)`,
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: pc.mutedBg }}
          >
            <Key className="h-5 w-5" style={{ color: pc.colorVar }} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {platformName}
            </h3>
            <code className="mt-0.5 block text-xs font-mono text-[var(--text-muted)]">
              {platformUrl}
            </code>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
            credential.status === "valid"
              ? "bg-[var(--emerald-muted)]"
              : credential.status === "empty"
                ? "bg-[var(--bg-tertiary)]"
                : credential.status === "expired"
                  ? "bg-[var(--rose-muted)]"
                  : "bg-[var(--amber-muted)]"
          )}
        >
          {isPolling ? (
            <>
              <span className="status-dot-polling" />
              <span className="text-xs font-medium text-[var(--accent)]">
                正在检测...
              </span>
            </>
          ) : (
            <>
              <span
                className={cn(
                  "status-dot",
                  credential.status !== "empty" && status.dotClass
                )}
                style={
                  credential.status === "empty"
                    ? { background: "var(--text-muted)" }
                    : undefined
                }
              />
              <span
                className={cn("text-xs font-medium", {
                  "text-[var(--emerald)]": credential.status === "valid",
                  "text-[var(--rose)]": credential.status === "expired",
                  "text-[var(--amber)]": credential.status === "unknown",
                  "text-[var(--text-muted)]": credential.status === "empty",
                })}
              >
                {status.label}
              </span>
              {credential.hasToken && credential.status === "valid" && (
                <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">
                  sk-***{isDeepseek ? "ds" : "qw"}
                </span>
              )}
            </>
          )}
        </div>

        {currentPolling.type !== "idle" && !isPolling && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
              currentPolling.type === "success" &&
                "bg-[var(--emerald-muted)] text-[var(--emerald)]",
              currentPolling.type === "error" &&
                "bg-[var(--rose-muted)] text-[var(--rose)]"
            )}
          >
            {currentPolling.type === "success" && (
              <Check className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{currentPolling.text}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onStartLogin}
            disabled={isPolling}
            className="btn btn-primary text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            一键登录
          </button>
          <button
            onClick={onAutoDetect}
            disabled={isPolling}
            className={cn(
              "btn rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] hover:border-[var(--card-hover-border)] hover:text-[var(--text-primary)]",
              isPolling && "opacity-45 cursor-not-allowed"
            )}
          >
            <ScanSearch className="h-3.5 w-3.5" />
            自动检测
          </button>
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="btn btn-ghost text-xs"
          >
            <Key className="h-3.5 w-3.5" />
            手动导入
          </button>
          <button
            onClick={onValidate}
            disabled={credential.status === "empty"}
            className={cn(
              "btn rounded-full border border-[var(--border-default)] px-2.5 text-xs text-[var(--text-secondary)] hover:border-[var(--card-hover-border)] hover:text-[var(--text-primary)]",
              credential.status === "empty" && "opacity-45 cursor-not-allowed"
            )}
          >
            <Check className="h-3.5 w-3.5" />
            验证
          </button>
          {credential.status !== "empty" && (
            <button
              onClick={onDelete}
              className="btn btn-danger text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </button>
          )}
        </div>

        {showManualInput && (
          <div className="animate-slide-up space-y-2 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
            <textarea
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder={`粘贴 ${platformName} 的 Token...`}
              rows={3}
              className="input-base resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleManualSubmit}
                disabled={!manualToken.trim()}
                className={cn(
                  "btn btn-primary text-xs",
                  !manualToken.trim() && "opacity-45 cursor-not-allowed"
                )}
              >
                导入
              </button>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualToken("");
                }}
                className="btn btn-ghost text-xs"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
