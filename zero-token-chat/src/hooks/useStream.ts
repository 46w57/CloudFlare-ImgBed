export interface StreamEvent {
  type: "content" | "thinking" | "tool_call" | "tool_result" | "search" | "error" | "done";
  data: unknown;
}

export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;

      if (trimmed.startsWith("data: ")) {
        const dataStr = trimmed.slice(6);
        if (dataStr === "[DONE]") {
          yield { type: "done", data: null };
          return;
        }
        try {
          const parsed = JSON.parse(dataStr);
          const eventType = parsed.type || "content";
          yield { type: eventType, data: parsed.data ?? parsed } as StreamEvent;
        } catch {
          yield { type: "content", data: { content: dataStr } };
        }
      }
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data: ")) {
      const dataStr = trimmed.slice(6);
      if (dataStr !== "[DONE]") {
        try {
          const parsed = JSON.parse(dataStr);
          yield { type: parsed.type || "content", data: parsed.data ?? parsed };
        } catch {
          yield { type: "content", data: { content: dataStr } };
        }
      }
    }
  }
}
