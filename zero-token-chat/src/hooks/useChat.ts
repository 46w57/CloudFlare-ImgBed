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

  const { modelParams, enableSearch, enableThinking } = useSettingsStore();

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      let convId = currentConversationId;
      if (!convId) {
        convId = createConversation("deepseek", "deepseek-chat");
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

        for await (const event of parseSSEStream(reader)) {
          switch (event.type) {
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
              const d = event.data as { id?: string; name?: string; arguments?: string };
              toolCalls.push({
                id: d.id || crypto.randomUUID(),
                name: d.name || "unknown",
                arguments: d.arguments || "",
                status: "running",
              });
              updateLastMessage(convId!, { toolCalls: [...toolCalls] });
              break;
            }
            case "tool_result": {
              const d = event.data as { id?: string; result?: string; success?: boolean };
              const tc = toolCalls.find((t) => t.id === d.id);
              if (tc) {
                tc.result = d.result;
                tc.status = d.success ? "success" : "error";
              }
              updateLastMessage(convId!, { toolCalls: [...toolCalls] });
              break;
            }
            case "search": {
              const d = event.data as SearchResult;
              searchResults.push(d);
              updateLastMessage(convId!, { searchResults: [...searchResults] });
              break;
            }
            case "error": {
              const d = event.data as { message?: string };
              fullContent += `\n\n❌ 错误: ${d.message || "未知错误"}`;
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
    ]
  );

  return {
    currentConversation,
    isStreaming,
    handleSend,
  };
}
