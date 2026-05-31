import { useState } from "react";
import {
  Circle,
  Loader2,
  Key,
  Check,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CredentialInfo, PollingStatus } from "@/store/cookieStore";

interface CredentialCardProps {
  platform: "deepseek" | "qwen";
  credential: CredentialInfo;
  pollingStatus: PollingStatus;
  onStartLogin: () => void;
  onManualImport: (token: string) => void;
  onValidate: () => void;
  onDelete: () => void;
}

export default function CredentialCard({
  platform,
  credential,
  pollingStatus,
  onStartLogin,
  onManualImport,
  onValidate,
  onDelete,
}: CredentialCardProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState("");

  const isDeepseek = platform === "deepseek";
  const platformName = isDeepseek ? "DeepSeek" : "Qwen";
  const platformUrl = isDeepseek ? "chat.deepseek.com" : "chat.qwen.ai";
  const platformColor = isDeepseek ? "text-blue-400" : "text-purple-400";
  const platformBg = isDeepseek ? "bg-blue-400/10" : "bg-purple-400/10";

  const statusColor: Record<CredentialInfo["status"], string> = {
    valid: "text-[var(--green)]",
    expired: "text-[var(--red)]",
    unknown: "text-yellow-400",
    empty: "text-[var(--text-secondary)]",
  };

  const statusText: Record<CredentialInfo["status"], string> = {
    valid: "有效",
    expired: "已过期",
    unknown: "未知",
    empty: "未配置",
  };

  const pollingText: Record<PollingStatus, string> = {
    idle: "",
    polling: "正在检测浏览器凭证...",
    found: "已找到凭证！",
    timeout: "检测超时，请尝试手动导入",
    error: "检测失败，请尝试手动导入",
  };

  const handleManualSubmit = () => {
    if (manualToken.trim()) {
      onManualImport(manualToken.trim());
      setManualToken("");
      setShowManualInput(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", platformBg)}>
          <Key className={cn("h-5 w-5", platformColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--text)]">{platformName}</h3>
            <span className="text-xs text-[var(--text-secondary)]">{platformUrl}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Circle
              className={cn("h-2.5 w-2.5 fill-current", statusColor[credential.status])}
            />
            <span className={cn("text-xs", statusColor[credential.status])}>
              {statusText[credential.status]}
            </span>
            {credential.lastChecked && (
              <span className="text-xs text-[var(--text-secondary)]">
                · 上次检查: {new Date(credential.lastChecked).toLocaleString("zh-CN")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {pollingStatus === "polling" && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-400/10 px-3 py-2 text-sm text-yellow-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{pollingText[pollingStatus]}</span>
          </div>
        )}

        {pollingStatus === "found" && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--green)]/10 px-3 py-2 text-sm text-[var(--green)]">
            <Check className="h-4 w-4" />
            <span>{pollingText[pollingStatus]}</span>
          </div>
        )}

        {(pollingStatus === "timeout" || pollingStatus === "error") && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--red)]/10 px-3 py-2 text-sm text-[var(--red)]">
            <span>{pollingText[pollingStatus]}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onStartLogin}
            disabled={pollingStatus === "polling"}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              pollingStatus === "polling"
                ? "cursor-not-allowed bg-[var(--border)] text-[var(--text-secondary)]"
                : "bg-[var(--blue)] text-white hover:opacity-90"
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            一键登录
          </button>
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)]"
          >
            <Key className="h-3.5 w-3.5" />
            手动导入
          </button>
          <button
            onClick={onValidate}
            disabled={credential.status === "empty"}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--border)]",
              credential.status === "empty"
                ? "cursor-not-allowed text-[var(--text-secondary)]/50"
                : "text-[var(--text-secondary)]"
            )}
          >
            <Check className="h-3.5 w-3.5" />
            验证
          </button>
          <button
            onClick={onDelete}
            disabled={credential.status === "empty"}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--red)]/10 hover:text-[var(--red)] hover:border-[var(--red)]/30",
              credential.status === "empty"
                ? "cursor-not-allowed text-[var(--text-secondary)]/50"
                : "text-[var(--text-secondary)]"
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>

        {showManualInput && (
          <div className="space-y-2">
            <textarea
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder={`粘贴 ${platformName} 的 Token...`}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleManualSubmit}
                disabled={!manualToken.trim()}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  manualToken.trim()
                    ? "bg-[var(--blue)] text-white hover:opacity-90"
                    : "bg-[var(--border)] text-[var(--text-secondary)] cursor-not-allowed"
                )}
              >
                导入
              </button>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualToken("");
                }}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)]"
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
