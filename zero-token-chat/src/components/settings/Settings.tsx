import { Moon, Sun, Thermometer, Hash, SlidersHorizontal, Terminal, FileText, FolderOpen, FileCode, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { useChatStore } from "@/store/chatStore";

export default function Settings() {
  const {
    theme,
    modelParams,
    enabledTools,
    toggleTheme,
    updateModelParams,
    toggleTool,
  } = useSettingsStore();

  const clearConversations = useChatStore((s) => s.clearConversations);

  const tools = [
    { key: "exec" as const, label: "命令执行", icon: Terminal, desc: "允许 AI 执行命令行命令" },
    { key: "readFile" as const, label: "读取文件", icon: FileText, desc: "允许 AI 读取本地文件" },
    { key: "writeFile" as const, label: "写入文件", icon: FileCode, desc: "允许 AI 写入或创建文件" },
    { key: "listDir" as const, label: "列出目录", icon: FolderOpen, desc: "允许 AI 列出目录内容" },
    { key: "applyPatch" as const, label: "应用补丁", icon: FileCode, desc: "允许 AI 应用代码补丁" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">设置</h2>
        <p className="text-sm text-[var(--text-secondary)]">自定义应用行为和外观</p>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
        <h3 className="font-medium text-[var(--text)]">外观</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-[var(--text-secondary)]" />
            ) : (
              <Sun className="h-4 w-4 text-[var(--text-secondary)]" />
            )}
            <span className="text-sm text-[var(--text)]">主题模式</span>
          </div>
          <button
            onClick={toggleTheme}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              theme === "dark" ? "bg-[var(--blue)]" : "bg-gray-300"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
        <h3 className="font-medium text-[var(--text)]">模型参数</h3>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text)]">温度</span>
              </div>
              <span className="text-sm font-mono text-[var(--blue)]">
                {modelParams.temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={modelParams.temperature}
              onChange={(e) =>
                updateModelParams({ temperature: parseFloat(e.target.value) })
              }
              className="w-full accent-[var(--blue)]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text)]">最大 Token 数</span>
              </div>
              <span className="text-sm font-mono text-[var(--blue)]">
                {modelParams.maxTokens}
              </span>
            </div>
            <input
              type="number"
              min="256"
              max="32768"
              step="256"
              value={modelParams.maxTokens}
              onChange={(e) =>
                updateModelParams({ maxTokens: parseInt(e.target.value) || 4096 })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text)]">Top-P</span>
              </div>
              <span className="text-sm font-mono text-[var(--blue)]">
                {modelParams.topP.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={modelParams.topP}
              onChange={(e) =>
                updateModelParams({ topP: parseFloat(e.target.value) })
              }
              className="w-full accent-[var(--blue)]"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
        <h3 className="font-medium text-[var(--text)]">工具权限</h3>
        <div className="space-y-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
                  <div>
                    <div className="text-sm text-[var(--text)]">{tool.label}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{tool.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleTool(tool.key)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    enabledTools[tool.key] ? "bg-[var(--blue)]" : "bg-gray-400/30"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                      enabledTools[tool.key] ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--red)]/20 bg-[var(--red)]/5 p-4 space-y-3">
        <h3 className="font-medium text-[var(--red)]">危险操作</h3>
        <button
          onClick={() => {
            if (window.confirm("确定要清除所有对话记录吗？此操作不可撤销。")) {
              clearConversations();
            }
          }}
          className="flex items-center gap-2 rounded-lg border border-[var(--red)]/30 px-3 py-1.5 text-sm text-[var(--red)] transition-colors hover:bg-[var(--red)]/10"
        >
          <Trash2 className="h-4 w-4" />
          清除所有对话
        </button>
      </section>
    </div>
  );
}
