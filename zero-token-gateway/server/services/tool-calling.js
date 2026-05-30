const TOOL_DEFINITIONS = `You have access to the following tools. When you need to use a tool, output a JSON block with "tool_name" and "arguments" fields:

1. web_search - Search the web for information
   Arguments: {"query": "search query string"}

2. web_fetch - Fetch content from a URL
   Arguments: {"url": "URL to fetch"}

3. exec - Execute a shell command (read-only)
   Arguments: {"command": "command to execute"}

4. read - Read a file from the workspace
   Arguments: {"path": "file path"}

5. write - Write content to a file in the workspace
   Arguments: {"path": "file path", "content": "file content"}

6. message - Send a message to the user
   Arguments: {"content": "message content"}

Use tools ONLY when the user's request clearly requires them. For normal conversation, respond directly without tools.`;

const TOOL_KEYWORDS = [
  'search', 'find', 'look up', 'google', 'browse', 'fetch', 'visit',
  'run', 'execute', 'command', 'shell', 'terminal',
  'read file', 'write file', 'save file', 'open file',
  'calculate', 'compute'
];

export function shouldInjectTools(messages) {
  const lastUserMsg = messages.filter(m => m.role === 'user').pop();
  if (!lastUserMsg) return false;
  const content = lastUserMsg.content.toLowerCase();
  return TOOL_KEYWORDS.some(kw => content.includes(kw));
}

export function injectToolPrompt(systemPrompt) {
  if (!systemPrompt) return TOOL_DEFINITIONS;
  return `${systemPrompt}\n\n${TOOL_DEFINITIONS}`;
}

export function parseToolCall(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*?"tool_name"[\s\S]*?\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.tool_name && parsed.arguments) {
      return parsed;
    }
  } catch {}
  return null;
}

export async function executeToolCall(toolCall, workspace) {
  const { tool_name, arguments: args } = toolCall;

  switch (tool_name) {
    case 'web_search':
      return { result: `[Web search results for: "${args.query}"]`, success: true };
    case 'web_fetch':
      return { result: `[Fetched content from: ${args.url}]`, success: true };
    case 'exec':
      return { result: '[Command execution is disabled in web mode]', success: false };
    case 'read':
      return { result: `[File read: ${args.path}]`, success: true };
    case 'write':
      return { result: `[File written: ${args.path}]`, success: true };
    case 'message':
      return { result: args.content, success: true };
    default:
      return { result: `Unknown tool: ${tool_name}`, success: false };
  }
}
