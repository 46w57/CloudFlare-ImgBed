import { Moon, Sun, Thermometer, Hash, SlidersHorizontal, Terminal, FileText, FolderOpen, FileCode, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { useChatStore } from "@/store/chatStore";

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="relative mb-4 pb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div
        className="absolute bottom-0 left-0 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--accent), var(--accent-muted), transparent)",
        }}
      />
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
  activeColor = "var(--accent)",
}: {
  enabled: boolean;
  onToggle: () => void;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        enabled ? "shadow-sm" : ""
      )}
      style={{
        backgroundColor: enabled ? activeColor : "var(--bg-tertiary)",
      }}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          enabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function SliderRow({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          <span className="text-xs text-[var(--text-primary)]">{label}</span>
        </div>
        <code className="text-xs font-mono text-[var(--accent)]">
          {typeof value === "number" && step < 1 ? value.toFixed(1) : value}
        </code>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-cyan w-full"
        style={{
          appearance: "none",
          height: "4px",
          borderRadius: "var(--radius-full)",
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((value - min) / (max - min)) * 100}%, var(--bg-tertiary) ${((value - min) / (max - min)) * 100}%, var(--bg-tertiary) 100%)`,
          outline: "none",
          cursor: "pointer",
        }}
      />
    </div>
  );
}

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
    <div className="animate-fade-in space-y-5">
      <div className="pt-1">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          设置
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          自定义应用行为和外观
        </p>
      </div>

      <section className="card-glass p-4 space-y-4">
        <SectionHeader icon={theme === "dark" ? Moon : Sun} title="外观" />

        <div className="flex items-center justify-between rounded-lg px-1 py-1">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200",
                theme === "dark"
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "bg-[var(--amber-muted)] text-[var(--amber)]"
              )}
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </div>
            <div>
              <span className="text-sm text-[var(--text-primary)]">主题模式</span>
              <p className="text-[10px] text-[var(--text-muted)]">
                {theme === "dark" ? "深色模式" : "浅色模式"}
              </p>
            </div>
          </div>
          <ToggleSwitch
            enabled={theme === "dark"}
            onToggle={toggleTheme}
            activeColor="var(--accent)"
          />
        </div>
      </section>

      <section className="card-glass p-4 space-y-5">
        <SectionHeader icon={SlidersHorizontal} title="模型参数" />

        <div className="space-y-4">
          <SliderRow
            icon={Thermometer}
            label="温度 (Temperature)"
            value={modelParams.temperature}
            min={0}
            max={2}
            step={0.1}
            onChange={(v) => updateModelParams({ temperature: v })}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <span className="text-xs text-[var(--text-primary)]">
                  最大 Token 数
                </span>
              </div>
              <code className="text-xs font-mono text-[var(--accent)]">
                {modelParams.maxTokens}
              </code>
            </div>
            <input
              type="number"
              min={256}
              max={32768}
              step={256}
              value={modelParams.maxTokens}
              onChange={(e) =>
                updateModelParams({ maxTokens: parseInt(e.target.value) || 4096 })
              }
              className="input-base"
            />
          </div>

          <SliderRow
            icon={SlidersHorizontal}
            label="Top-P (Nucleus Sampling)"
            value={modelParams.topP}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateModelParams({ topP: v })}
          />
        </div>
      </section>

      <section className="card-glass p-4 space-y-4">
        <SectionHeader icon={Terminal} title="工具权限" />

        <div className="space-y-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.key}
                className="group flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      enabledTools[tool.key]
                        ? "bg-[var(--emerald-muted)] text-[var(--emerald)]"
                        : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--text-primary)]">
                      {tool.label}
                    </div>
                    <div className="truncate text-[11px] leading-tight text-[var(--text-muted)]">
                      {tool.desc}
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  enabled={enabledTools[tool.key]}
                  onToggle={() => toggleTool(tool.key)}
                  activeColor="var(--emerald)"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="card-glass overflow-hidden p-4"
        style={{
          borderColor: "rgba(244, 63, 94, 0.15)",
          background: "rgba(244, 63, 94, 0.04)",
        }}
      >
        <div className="relative mb-3 pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-[var(--rose)]" />
            <h3 className="text-sm font-semibold text-[var(--rose)]">危险操作</h3>
          </div>
          <div
            className="absolute bottom-0 left-0 h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, var(--rose), var(--rose-muted), transparent)",
            }}
          />
        </div>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          以下操作不可撤销，请谨慎操作。
        </p>
        <button
          onClick={() => {
            if (window.confirm("确定要清除所有对话记录吗？此操作不可撤销。")) {
              clearConversations();
            }
          }}
          className="btn btn-danger text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          清除所有对话
        </button>
      </section>
    </div>
  );
}
