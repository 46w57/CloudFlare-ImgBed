import { useState } from "react";
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ImportGuide() {
  const [expanded, setExpanded] = useState(false);

  const steps = [
    {
      title: "一键登录（推荐）",
      items: [
        "点击对应平台的「一键登录」按钮",
        "系统会自动打开浏览器，跳转到平台登录页面",
        "在浏览器中完成登录操作",
        "应用会自动检测浏览器中的凭证并保存",
        "检测过程最长等待 5 分钟，通常几秒内即可完成",
      ],
    },
    {
      title: "手动导入（备选）",
      items: [
        "在浏览器中打开对应平台并登录",
        "按 F12 打开开发者工具",
        "切换到 Application（应用）选项卡",
        "在左侧找到 Local Storage，点击对应域名",
        "DeepSeek: 复制 userToken 的值",
        "Qwen: 复制 token 的值",
        "点击「手动导入」按钮，粘贴 Token",
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors",
          "hover:bg-[var(--border)] text-[var(--text-secondary)]"
        )}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <HelpCircle className="h-4 w-4 shrink-0 text-[var(--blue)]" />
        <span className="font-medium">导入引导</span>
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-4">
          {steps.map((step, idx) => (
            <div key={idx}>
              <h4 className="mb-2 text-sm font-medium text-[var(--text)]">
                {idx + 1}. {step.title}
              </h4>
              <ol className="space-y-1.5 pl-4">
                {step.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-xs text-[var(--text-secondary)] leading-relaxed"
                  >
                    <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--border)] text-[10px] font-medium text-[var(--text-secondary)]">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
