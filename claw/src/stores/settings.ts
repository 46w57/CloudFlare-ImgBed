import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderInfo } from '@/lib/types';
import { api, getBackendBaseUrl } from '@/lib/api';

interface SettingsState {
  defaultProvider: string;
  defaultModel: string;
  defaultExpertMode: boolean;
  providers: ProviderInfo[];
  loadingProviders: boolean;
  loadProviders: () => Promise<void>;
  setDefaults: (p: Partial<Pick<SettingsState, 'defaultProvider' | 'defaultModel' | 'defaultExpertMode'>>) => void;
  refreshStatus: () => Promise<void>;
  backendUrl: string | null;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      defaultProvider: 'deepseek',
      defaultModel: 'deepseek-v4-pro',
      defaultExpertMode: false,
      providers: [],
      loadingProviders: false,
      backendUrl: null,
      loadProviders: async () => {
        set({ loadingProviders: true });
        try {
          const base = await getBackendBaseUrl();
          set({ backendUrl: base });
          const data = await api<ProviderInfo[]>('/api/providers');
          set({ providers: data });
        } catch (err) {
          console.error('loadProviders error', err);
        } finally {
          set({ loadingProviders: false });
        }
      },
      setDefaults: (p) => set(p),
      refreshStatus: async () => {
        await get().loadProviders();
      },
    }),
    {
      name: 'claw-settings',
      version: 1,
      partialize: (s) => ({
        defaultProvider: s.defaultProvider,
        defaultModel: s.defaultModel,
        defaultExpertMode: s.defaultExpertMode,
      }),
    }
  )
);
