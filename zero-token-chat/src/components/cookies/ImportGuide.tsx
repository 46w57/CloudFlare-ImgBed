import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ImportGuide() {
  const [expanded, setExpanded] = useState(false);

  const sections = [
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
    <div className="card-glass overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--accent-muted)]"
      >
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
            expanded
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--accent-muted)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white"
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          导入引导
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--border-default)] px-4 py-4 space-y-5">
            {sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                      sectionIdx === 0
                        ? "bg-[var(--emerald-muted)] text-[var(--emerald)]"
                        : "bg-[var(--amber-muted)] text-[var(--amber)]"
                    )}
                  >
                    {sectionIdx + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    {section.title}
                  </h4>
                </div>
                <ol className="space-y-2 pl-8">
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className="group/item flex items-start gap-2.5 text-xs leading-relaxed text-[var(--text-secondary)]"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold transition-colors",
                          sectionIdx === 0
                            ? "bg-[var(--bg-tertiary)] text-[var(--emerald)] group-hover/item:bg-[var(--emerald-muted)]"
                            : "bg-[var(--bg-tertiary)] text-[var(--amber)] group-hover/item:bg-[var(--amber-muted)]"
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
