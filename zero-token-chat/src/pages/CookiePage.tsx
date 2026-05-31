import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CookieManager from "@/components/cookies/CookieManager";

export default function CookiePage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回聊天
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl">
          <CookieManager />
        </div>
      </div>
    </div>
  );
}
