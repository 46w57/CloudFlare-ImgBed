import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  theme: "dark" | "light";
  selectedModel: string;
  modelParams: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  enabledTools: {
    exec: boolean;
    readFile: boolean;
    writeFile: boolean;
    listDir: boolean;
    applyPatch: boolean;
  };
  enableSearch: boolean;
  enableThinking: boolean;
  toggleTheme: () => void;
  setSelectedModel: (model: string) => void;
  updateModelParams: (params: Partial<SettingsState["modelParams"]>) => void;
  toggleTool: (tool: keyof SettingsState["enabledTools"]) => void;
  setEnableSearch: (enabled: boolean) => void;
  setEnableThinking: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      selectedModel: "deepseek-chat",
      modelParams: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 0.9,
      },
      enabledTools: {
        exec: false,
        readFile: true,
        writeFile: false,
        listDir: true,
        applyPatch: false,
      },
      enableSearch: false,
      enableThinking: true,

      toggleTheme: () => {
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        }));
      },

      setSelectedModel: (model) => {
        set({ selectedModel: model });
      },

      updateModelParams: (params) => {
        set((state) => ({
          modelParams: { ...state.modelParams, ...params },
        }));
      },

      toggleTool: (tool) => {
        set((state) => ({
          enabledTools: {
            ...state.enabledTools,
            [tool]: !state.enabledTools[tool],
          },
        }));
      },

      setEnableSearch: (enabled) => {
        set({ enableSearch: enabled });
      },

      setEnableThinking: (enabled) => {
        set({ enableThinking: enabled });
      },
    }),
    {
      name: "zero-token-chat-settings",
    }
  )
);
