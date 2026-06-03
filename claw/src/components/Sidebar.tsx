import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Settings as SettingsIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import clsx from 'clsx';
import { useSessions } from '@/stores/sessions';
import { useSettings } from '@/stores/settings';
import { SettingsPage } from '@/pages/SettingsPage';

export function Sidebar() {
  const { sessions, currentId, createSession, setCurrent, deleteSession } = useSessions();
  const { defaultProvider, defaultModel, defaultExpertMode } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const list = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleNew = () => {
    createSession(defaultProvider, defaultModel, defaultExpertMode);
  };

  if (showSettings) {
    return (
      <aside className="h-full w-72 flex-shrink-0 border-r border-line bg-bg-panel flex flex-col">
        <div className="p-3 flex items-center gap-2 border-b border-line">
          <button
            onClick={() => setShowSettings(false)}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary"
            title="返回聊天"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">设置</span>
        </div>
        <SettingsPage />
      </aside>
    );
  }

  return (
    <aside
      className={clsx(
        'h-full flex-shrink-0 border-r border-line bg-bg-panel flex flex-col transition-all',
        collapsed ? 'w-14' : 'w-72'
      )}
    >
      <div className="p-3 flex items-center gap-2 border-b border-line">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded hover:bg-bg-hover text-text-secondary flex-shrink-0"
          title={collapsed ? '展开' : '折叠'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        {!collapsed && <span className="text-sm font-medium">Claw</span>}
        <div className="flex-1" />
        {!collapsed && (
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary"
            title="设置"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-3">
        <button
          onClick={handleNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-line hover:bg-bg-hover text-sm text-text-primary transition-colors"
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>新建对话</span>}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {!collapsed && list.length === 0 && (
          <div className="text-center text-text-muted text-xs mt-8 px-4">
            还没有对话
            <br />
            点击"新建对话"开始
          </div>
        )}
        {list.map((s) => (
          <div
            key={s.id}
            className={clsx(
              'group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm mb-0.5',
              currentId === s.id ? 'bg-bg-hover text-text-primary' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            )}
            onClick={() => setCurrent(s.id)}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{s.title || '新对话'}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`删除「${s.title}」？`)) deleteSession(s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-subtle text-text-muted"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {!collapsed && (
        <div className="p-3 border-t border-line text-xs text-text-muted">
          <div>v0.1.0 · Zero Token</div>
        </div>
      )}
    </aside>
  );
}
