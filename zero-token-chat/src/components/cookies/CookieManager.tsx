import { useEffect } from "react";
import { Shield } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--blue)]/10">
          <Shield className="h-5 w-5 text-[var(--blue)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">凭证管理</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            管理 DeepSeek 和 Qwen 的登录凭证，{validCount}/2 个平台已配置
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
