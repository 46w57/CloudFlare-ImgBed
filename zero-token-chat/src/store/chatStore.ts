import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId } from "@/utils/api";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: "running" | "success" | "error";
}

export interface SearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  thinkingContent?: string;
  toolCalls?: ToolCall[];
  searchResults?: SearchResult[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  platform: "deepseek" | "qwen";
  model: string;
  messages: Message[];
  chatSessionId?: string;
  parentMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isStreaming: boolean;
  createConversation: (platform: "deepseek" | "qwen", model: string) => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastMessage: (conversationId: string, updates: Partial<Message>) => void;
  updateConversationTitle: (id: string, title: string) => void;
  clearConversations: () => void;
  setIsStreaming: (streaming: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      currentConversationId: null,
      isStreaming: false,

      createConversation: (platform, model) => {
        const id = generateId();
        const now = new Date().toISOString();
        const conversation: Conversation = {
          id,
          title: "新对话",
          platform,
          model,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: id,
        }));
        return id;
      },

      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          const newCurrentId =
            state.currentConversationId === id
              ? filtered[0]?.id ?? null
              : state.currentConversationId;
          return {
            conversations: filtered,
            currentConversationId: newCurrentId,
          };
        });
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id });
      },

      addMessage: (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
      },

      updateLastMessage: (conversationId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId || c.messages.length === 0) return c;
            const msgs = [...c.messages];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...updates };
            return { ...c, messages: msgs, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      updateConversationTitle: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      clearConversations: () => {
        set({ conversations: [], currentConversationId: null });
      },

      setIsStreaming: (streaming) => {
        set({ isStreaming: streaming });
      },
    }),
    {
      name: "zero-token-chat-conversations",
    }
  )
);
