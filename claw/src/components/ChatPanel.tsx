import { useEffect, useRef, useState } from 'react';
import { Send, StopCircle, AlertTriangle, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import clsx from 'clsx';
import { useSessions, type ChatSession } from '@/stores/sessions';
import { getBackendBaseUrl } from '@/lib/api';
import type { Message, ChatRequestBody } from '@/lib/types';

export function ChatPanel({ session }: { session: ChatSession }) {
  const { updateLastMessage, appendMessage } = useSessions();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.messages.length, session.messages[session.messages.length - 1]?.content]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setError(null);

    const userMsg: Message = {
      id: `m_${Date.now()}_u`,
      role: 'user',
      content: text,
      ts: Date.now(),
    };
    appendMessage(session.id, userMsg);

    const assistantMsg: Message = {
      id: `m_${Date.now()}_a`,
      role: 'assistant',
      content: '',
      ts: Date.now(),
    };
    appendMessage(session.id, assistantMsg);

    setStreaming(true);
    abortRef.current = new AbortController();
    const base = await getBackendBaseUrl();
    const body: ChatRequestBody = {
      provider: session.provider,
      model: session.model,
      messages: session.messages
        .filter((m) => m.role !== 'assistant' || m.content)
        .map((m) => ({ role: m.role, content: m.content })),
      expert_mode: session.expertMode,
      stream: true,
      enable_tools: true,
    };
    try {
      const resp = await fetch(`${base}/api/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });
      if (!resp.ok || !resp.body) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 300)}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accContent = '';
      let accThinking = '';
      let finishReason: string | null = null;
      let toolResult: { name: string; result: string } | undefined = undefined;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const chunk of lines) {
          const line = chunk.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            finishReason = finishReason || 'stop';
            break;
          }
          try {
            const obj = JSON.parse(data);
            if (obj.tool_result) {
              toolResult = obj.tool_result;
            }
            if (obj.error) {
              setError(obj.error);
              finishReason = 'error';
            } else if (obj.delta) {
              if (obj.is_thinking) {
                accThinking += obj.delta;
              } else {
                accContent += obj.delta;
              }
            }
            if (obj.finish_reason) finishReason = obj.finish_reason;
            updateLastMessage(session.id, {
              content: accContent,
              thinking: accThinking || undefined,
              toolResult,
            });
          } catch (e) {
            // 忽略解析错误
            console.warn('parse SSE error', e, data);
          }
        }
      }
      if (finishReason === 'error' && !accContent) {
        updateLastMessage(session.id, { error: error || '请求失败' });
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message || String(e));
        updateLastMessage(session.id, { error: e?.message || String(e) });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {session.messages.length === 0 && <WelcomeHint session={session} />}
          {session.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </div>
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 py-2">
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">出错了</div>
              <div className="text-xs mt-0.5 opacity-80 break-all">{error}</div>
            </div>
          </div>
        </div>
      )}
      <div className="border-t border-line bg-bg-panel p-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-bg-subtle border border-line rounded-xl p-2 focus-within:border-accent/50 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={
                session.expertMode
                  ? `${session.model} · 专家模式已启用。输入你的问题，Shift+Enter 换行`
                  : `${session.model} · 输入你的问题，Shift+Enter 换行`
              }
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-text-muted max-h-40 px-2 py-1.5"
              style={{ minHeight: '36px' }}
            />
            {streaming ? (
              <button
                onClick={stop}
                className="p-2 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                title="停止"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                className="p-2 rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="发送"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-[11px] text-text-muted text-center mt-2 flex items-center justify-center gap-2">
            <Wrench className="w-3 h-3" />
            模型可能产生错误，请核实重要信息。工具调用在本地沙箱中执行。
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeHint({ session }: { session: ChatSession }) {
  return (
    <div className="text-center py-12">
      <div className="text-2xl mb-2">👋</div>
      <div className="text-base font-medium mb-1">
        正在使用 {session.model}
        {session.expertMode && <span className="ml-2 text-xs text-accent">(专家模式)</span>}
      </div>
      <div className="text-xs text-text-muted">可以试试问我代码、写作、数学或工具调用相关的任务</div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={clsx('flex gap-3 mb-6 animate-fade-in', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-md bg-accent flex-shrink-0 flex items-center justify-center text-white text-sm">
          AI
        </div>
      )}
      <div className={clsx('flex-1 min-w-0 max-w-[85%]', isUser && 'flex flex-col items-end')}>
        {message.thinking && (
          <details className="thinking mb-2 cursor-pointer">
            <summary className="list-none">💭 思考过程</summary>
            <div className="mt-1 text-sm whitespace-pre-wrap">{message.thinking}</div>
          </details>
        )}
        {message.toolResult && (
          <details className="mb-2 text-xs text-text-muted">
            <summary className="cursor-pointer hover:text-text-secondary">
              <Wrench className="w-3 h-3 inline" /> 工具: {message.toolResult.name}
            </summary>
            <pre className="mt-1 p-2 bg-bg-subtle border border-line rounded text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
              {message.toolResult.result}
            </pre>
          </details>
        )}
        {message.error ? (
          <div className="text-red-400 text-sm px-3 py-2 rounded bg-red-500/10 border border-red-500/30">
            错误: {message.error}
          </div>
        ) : isUser ? (
          <div className="inline-block px-4 py-2.5 rounded-2xl bg-bg-subtle border border-line text-text-primary whitespace-pre-wrap break-words text-sm">
            {message.content}
          </div>
        ) : (
          <div
            className={clsx(
              'markdown text-text-primary text-[15px]',
              !message.content && 'cursor-blink'
            )}
          >
            {message.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </ReactMarkdown>
            ) : (
              <span className="text-text-muted">▍</span>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-md bg-bg-subtle border border-line flex-shrink-0 flex items-center justify-center text-text-secondary text-sm">
          U
        </div>
      )}
    </div>
  );
}
