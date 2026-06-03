import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message } from '@/lib/types';

export interface ChatSession {
  id: string;
  title: string;
  provider: string;
  model: string;
  expertMode: boolean;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface SessionState {
  sessions: Record<string, ChatSession>;
  currentId: string | null;
  createSession: (provider: string, model: string, expertMode: boolean) => ChatSession;
  setCurrent: (id: string | null) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  appendMessage: (id: string, message: Message) => void;
  updateLastMessage: (id: string, patch: Partial<Message>) => void;
  clearAll: () => void;
}

export const useSessions = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      currentId: null,
      createSession: (provider, model, expertMode) => {
        const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const sess: ChatSession = {
          id,
          title: '新对话',
          provider,
          model,
          expertMode,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          sessions: { ...state.sessions, [id]: sess },
          currentId: id,
        }));
        return sess;
      },
      setCurrent: (id) => set({ currentId: id }),
      deleteSession: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.sessions;
          return {
            sessions: rest,
            currentId: state.currentId === id ? null : state.currentId,
          };
        }),
      renameSession: (id, title) =>
        set((state) => {
          const s = state.sessions[id];
          if (!s) return state;
          return {
            sessions: { ...state.sessions, [id]: { ...s, title, updatedAt: Date.now() } },
          };
        }),
      appendMessage: (id, message) =>
        set((state) => {
          const s = state.sessions[id];
          if (!s) return state;
          return {
            sessions: {
              ...state.sessions,
              [id]: {
                ...s,
                messages: [...s.messages, message],
                updatedAt: Date.now(),
              },
            },
          };
        }),
      updateLastMessage: (id, patch) =>
        set((state) => {
          const s = state.sessions[id];
          if (!s || s.messages.length === 0) return state;
          const messages = [...s.messages];
          messages[messages.length - 1] = { ...messages[messages.length - 1], ...patch };
          // 第一次成功回复后把对话标题改为用户第一句前 20 字
          let title = s.title;
          if (s.title === '新对话' && messages.length >= 2 && messages[0].role === 'user') {
            title = messages[0].content.slice(0, 20).replace(/\n/g, ' ');
          }
          return {
            sessions: {
              ...state.sessions,
              [id]: { ...s, messages, title, updatedAt: Date.now() },
            },
          };
        }),
      clearAll: () => set({ sessions: {}, currentId: null }),
    }),
    {
      name: 'claw-sessions',
      version: 1,
    }
  )
);
