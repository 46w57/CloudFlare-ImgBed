import { useState } from "react";
import Sidebar, { SidebarToggle } from "@/components/sidebar/Sidebar";
import ChatArea from "@/components/chat/ChatArea";
import InputArea from "@/components/chat/InputArea";

export default function ChatPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(true)}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
          {sidebarCollapsed && (
            <SidebarToggle onClick={() => setSidebarCollapsed(false)} />
          )}
          <div className="flex-1" />
        </div>
        <ChatArea />
        <InputArea />
      </div>
    </div>
  );
}
