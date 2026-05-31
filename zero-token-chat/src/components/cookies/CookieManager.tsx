import { useEffect } from "react";
import { KeyRound } from "lucide-react";
import { useCookies } from "@/hooks/useCookies";
import CredentialCard from "./CredentialCard";
import ImportGuide from "./ImportGuide";

export default function CookieManager() {
  const {
    credentials,
    pollingStatus,
    refreshCredentials,
    handleStartLogin,
    handleAutoDetect,
    handleManualImport,
    handleValidate,
    handleDelete,
  } = useCookies();

  useEffect(() => {
    refreshCredentials();
  }, [refreshCredentials]);

  const validCount = [credentials.deepseek, credentials.qwen].filter(
    (c) => c.status === "valid"
  ).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]/20">
          <KeyRound className="h-6 w-6 text-[var(--accent)]" />
        </div>
        <div className="pt-0.5">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            凭证管理
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            管理 DeepSeek 和 Qwen 的登录凭证，用于调用 AI 模型 API。
            <span className="ml-1 inline-flex items-center gap-1 font-medium text-[var(--accent)]">
              {validCount}
              <span className="text-[var(--text-secondary)]">/</span>
              2
              <span className="font-normal text-[var(--text-secondary)]">
                个平台已配置
              </span>
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CredentialCard
          platform="deepseek"
          credential={credentials.deepseek}
          pollingStatus={pollingStatus.deepseek}
          onStartLogin={() => handleStartLogin("deepseek")}
          onAutoDetect={() => handleAutoDetect("deepseek")}
          onManualImport={(token) => handleManualImport("deepseek", token)}
          onValidate={() => handleValidate("deepseek")}
          onDelete={() => handleDelete("deepseek")}
        />
        <CredentialCard
          platform="qwen"
          credential={credentials.qwen}
          pollingStatus={pollingStatus.qwen}
          onStartLogin={() => handleStartLogin("qwen")}
          onAutoDetect={() => handleAutoDetect("qwen")}
          onManualImport={(token) => handleManualImport("qwen", token)}
          onValidate={() => handleValidate("qwen")}
          onDelete={() => handleDelete("qwen")}
        />
      </div>

      <ImportGuide />
    </div>
  );
}
