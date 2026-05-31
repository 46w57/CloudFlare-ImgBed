import { useCallback } from "react";
import { useChatStore, type Message, type ToolCall, type SearchResult } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { sendChatMessage } from "@/utils/api";
import { parseSSEStream } from "@/hooks/useStream";

export function useChat() {
  const {
    conversations,
    currentConversationId,
    isStreaming,
    createConversation,
    addMessage,
    updateLastMessage,
    updateConversationTitle,
    setIsStreaming,
  } = useChatStore();

  const { modelParams, enableSearch, enableThinking, selectedModel } = useSettingsStore();

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      let convId = currentConversationId;
      if (!convId) {
        const platform = selectedModel.startsWith("qwen") ? "qwen" as const : "deepseek" as const;
        convId = createConversation(platform, selectedModel);
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      addMessage(convId, userMessage);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        thinkingContent: "",
        toolCalls: [],
        searchResults: [],
        createdAt: new Date().toISOString(),
      };
      addMessage(convId, assistantMessage);
      setIsStreaming(true);

      try {
        const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
        const messages = (conv?.messages || [])
          .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await sendChatMessage({
          platform: conv?.platform || "deepseek",
          model: conv?.model || "deepseek-chat",
          messages,
          stream: true,
          enableSearch,
          enableThinking,
          chatSessionId: conv?.chatSessionId,
          parentMessageId: conv?.parentMessageId,
          temperature: modelParams.temperature,
          maxTokens: modelParams.maxTokens,
          topP: modelParams.topP,
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        let fullContent = "";
        let thinkingContent = "";
        const toolCalls: ToolCall[] = [];
        const searchResults: SearchResult[] = [];
        let sessionChatId: string | undefined;
        let sessionParentId: string | undefined;

        for await (const event of parseSSEStream(reader)) {
          switch (event.type) {
            case "session_info": {
              const d = event.data as { content?: string };
              if (d.content) {
                try {
                  const info = JSON.parse(d.content as string);
                  sessionChatId = info.chat_session_id;
                  sessionParentId = info.parent_message_id;
                  if (convId) {
                    useChatStore.setState((s) => ({
                      conversations: s.conversations.map((c) =>
                        c.id === convId
                          ? { ...c, chatSessionId: sessionChatId, parentMessageId: sessionParentId }
                          : c
                      ),
                    }));
                  }
                } catch { /* ignore */ }
              }
              break;
            }
            case "content": {
              const d = event.data as { content?: string };
              if (d.content) {
                fullContent += d.content;
                updateLastMessage(convId!, { content: fullContent });
              }
              break;
            }
            case "thinking": {
              const d = event.data as { content?: string };
              if (d.content) {
                thinkingContent += d.content;
                updateLastMessage(convId!, { thinkingContent });
              }
              break;
            }
            case "tool_call": {
              const d = event.data as { id?: string; name?: string; arguments?: string; content?: string };
              let toolName = d.name || "unknown";
              let toolArgs = d.arguments || "";
              let toolId = d.id || crypto.randomUUID();
              if (d.content && !d.name) {
                try {
                  const parsed = JSON.parse(d.content);
                  toolName = parsed.name || "unknown";
                  toolArgs = typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments || {});
                  toolId = parsed.id || toolId;
                } catch {
                  toolArgs = d.content;
                }
              }
              toolCalls.push({
                id: toolId,
                name: toolName,
                arguments: toolArgs,
                status: "running",
              });
              updateLastMessage(convId!, { toolCalls: [...toolCalls] });
              break;
            }
            case "tool_result": {
              const d = event.data as { tool_call_id?: string; id?: string; content?: string; result?: string; success?: boolean; tool_name?: string };
              const matchId = d.tool_call_id || d.id;
              const tc = toolCalls.find((t) => t.id === matchId || t.name === d.tool_name);
              if (tc) {
                tc.result = d.result || d.content;
                tc.status = d.success !== false ? "success" : "error";
              }
              updateLastMessage(convId!, { toolCalls: [...toolCalls] });
              break;
            }
            case "search": {
              const d = event.data as unknown as SearchResult;
              searchResults.push(d);
              updateLastMessage(convId!, { searchResults: [...searchResults] });
              break;
            }
            case "error": {
              const d = event.data as { message?: string; content?: string };
              fullContent += `\n\n❌ 错误: ${d.message || d.content || "未知错误"}`;
              updateLastMessage(convId!, { content: fullContent });
              break;
            }
            case "done":
              break;
          }
        }

        if (fullContent && useChatStore.getState().conversations.find((c) => c.id === convId)?.title === "新对话") {
          const title = fullContent.slice(0, 30).replace(/\n/g, " ") || "新对话";
          updateConversationTitle(convId!, title);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "发送失败";
        updateLastMessage(convId!, {
          content: `❌ 请求失败: ${errorMsg}`,
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [
      currentConversationId,
      isStreaming,
      createConversation,
      addMessage,
      updateLastMessage,
      updateConversationTitle,
      setIsStreaming,
      modelParams,
      enableSearch,
      enableThinking,
      selectedModel,
    ]
  );

  return {
    currentConversation,
    isStreaming,
    handleSend,
  };
}
