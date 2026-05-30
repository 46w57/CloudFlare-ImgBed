import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TOOL_DEFINITIONS = `You have access to the following tools. When you need to use a tool, output a JSON block with "tool_name" and "arguments" fields:

1. web_search - Search the web for information using the platform's built-in search
   Arguments: {"query": "search query string"}

2. web_fetch - Fetch content from a URL
   Arguments: {"url": "URL to fetch"}

3. exec - Execute a shell command (restricted to workspace directory)
   Arguments: {"command": "command to execute"}

4. read - Read a file from the workspace
   Arguments: {"path": "file path relative to workspace"}

5. write - Write content to a file in the workspace
   Arguments: {"path": "file path relative to workspace", "content": "file content"}

6. message - Send a message to the user
   Arguments: {"content": "message content"}

IMPORTANT: Output tool calls as a separate JSON block:
{"tool_name": "web_search", "arguments": {"query": "latest AI news"}}
After the tool result is provided, you can continue your response.

Use tools ONLY when the user's request clearly requires them. For normal conversation, respond directly without tools.`;

const TOOL_KEYWORDS = [
  'search', 'find', 'look up', 'google', 'browse', 'fetch', 'visit',
  'run', 'execute', 'command', 'shell', 'terminal',
  'read file', 'write file', 'save file', 'open file',
  'calculate', 'compute', '搜索', '查找', '查找一下', '搜一下',
  '执行', '运行', '读取', '写入', '保存'
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
    const patterns = [
      /\{"tool_name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]*\})\s*\}/,
      /\{"tool_name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]*\})\s*\}/s,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return {
          tool_name: match[1],
          arguments: JSON.parse(match[2])
        };
      }
    }

    const jsonMatch = content.match(/\{[\s\S]*?"tool_name"[\s\S]*?"arguments"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tool_name && parsed.arguments) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export async function executeToolCall(toolCall, workspace) {
  const { tool_name, arguments: args } = toolCall;
  const safeWorkspace = workspace || process.cwd();

  switch (tool_name) {
    case 'web_search':
      return {
        result: `[Web search triggered for: "${args.query}". The AI platform's built-in search will handle this query.]`,
        success: true,
        display: `🔍 Searching: "${args.query}"`
      };

    case 'web_fetch': {
      try {
        const response = await fetch(args.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZeroTokenGateway/1.0)' }
        });
        const text = await response.text();
        const truncated = text.length > 5000 ? text.slice(0, 5000) + '...[truncated]' : text;
        return { result: truncated, success: true, display: `🌐 Fetched: ${args.url}` };
      } catch (err) {
        return { result: `Failed to fetch ${args.url}: ${err.message}`, success: false, display: `❌ Fetch failed: ${args.url}` };
      }
    }

    case 'exec': {
      try {
        const allowedCommands = ['ls', 'dir', 'cat', 'head', 'tail', 'wc', 'echo', 'pwd', 'whoami', 'date', 'df', 'du'];
        const cmdBase = args.command.trim().split(/\s+/)[0];
        if (!allowedCommands.includes(cmdBase)) {
          return {
            result: `Command "${cmdBase}" is not allowed. Allowed commands: ${allowedCommands.join(', ')}`,
            success: false,
            display: `🚫 Command blocked: ${args.command}`
          };
        }
        const output = execSync(args.command, {
          cwd: safeWorkspace,
          timeout: 10000,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024
        });
        return { result: output || '(no output)', success: true, display: `⚡ Executed: ${args.command}` };
      } catch (err) {
        return { result: `Command failed: ${err.message}`, success: false, display: `❌ Command failed: ${args.command}` };
      }
    }

    case 'read': {
      try {
        const filePath = path.resolve(safeWorkspace, args.path);
        if (!filePath.startsWith(path.resolve(safeWorkspace))) {
          return { result: 'Access denied: path outside workspace', success: false, display: `🚫 Access denied: ${args.path}` };
        }
        if (!fs.existsSync(filePath)) {
          return { result: `File not found: ${args.path}`, success: false, display: `❌ File not found: ${args.path}` };
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const truncated = content.length > 10000 ? content.slice(0, 10000) + '...[truncated]' : content;
        return { result: truncated, success: true, display: `📄 Read: ${args.path}` };
      } catch (err) {
        return { result: `Failed to read file: ${err.message}`, success: false, display: `❌ Read failed: ${args.path}` };
      }
    }

    case 'write': {
      try {
        const filePath = path.resolve(safeWorkspace, args.path);
        if (!filePath.startsWith(path.resolve(safeWorkspace))) {
          return { result: 'Access denied: path outside workspace', success: false, display: `🚫 Access denied: ${args.path}` };
        }
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, args.content || '', 'utf-8');
        return { result: `File written successfully: ${args.path}`, success: true, display: `💾 Written: ${args.path}` };
      } catch (err) {
        return { result: `Failed to write file: ${err.message}`, success: false, display: `❌ Write failed: ${args.path}` };
      }
    }

    case 'message':
      return { result: args.content, success: true, display: `💬 Message: ${args.content?.slice(0, 50)}` };

    default:
      return { result: `Unknown tool: ${tool_name}`, success: false, display: `❓ Unknown tool: ${tool_name}` };
  }
}

export { TOOL_DEFINITIONS, TOOL_KEYWORDS };
