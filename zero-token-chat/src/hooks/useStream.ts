export interface StreamEvent {
  type: "content" | "thinking" | "tool_call" | "tool_result" | "search" | "error" | "done" | "session_info";
  data: Record<string, unknown>;
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

      if (trimmed.startsWith("data:")) {
        const dataStr = trimmed.slice(5).trimStart();
        if (dataStr === "[DONE]") {
          yield { type: "done", data: {} };
          return;
        }
        try {
          const parsed = JSON.parse(dataStr);
          const eventType = parsed.type || "content";
          const eventData: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(parsed)) {
            if (key !== "type") {
              eventData[key] = val;
            }
          }
          yield { type: eventType, data: eventData } as StreamEvent;
        } catch {
          yield { type: "content", data: { content: dataStr } };
        }
      }
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
      const dataStr = trimmed.slice(5).trimStart();
      if (dataStr !== "[DONE]") {
        try {
          const parsed = JSON.parse(dataStr);
          const eventType = parsed.type || "content";
          const eventData: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(parsed)) {
            if (key !== "type") {
              eventData[key] = val;
            }
          }
          yield { type: eventType, data: eventData };
        } catch {
          yield { type: "content", data: { content: dataStr } };
        }
      }
    }
  }
}
