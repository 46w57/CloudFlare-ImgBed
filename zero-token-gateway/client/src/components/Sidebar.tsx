import { NavLink } from 'react-router-dom'
import { MessageSquare, Layers, Settings, Zap } from 'lucide-react'

export default function Sidebar() {
  const links = [
    { to: '/', icon: MessageSquare, label: 'Chat' },
    { to: '/askonce', icon: Layers, label: 'AskOnce' },
    { to: '/config', icon: Settings, label: 'Config' },
  ]

  return (
    <aside className="w-16 lg:w-56 bg-bg-secondary border-r border-border flex flex-col shrink-0">
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <Zap className="w-6 h-6 text-accent shrink-0" />
        <span className="hidden lg:block text-lg font-bold glow-text font-mono">
          ZeroToken
        </span>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-accent/10 text-accent glow-border'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="hidden lg:block text-xs text-text-muted text-center font-mono">
          v1.0.0
        </div>
      </div>
    </aside>
  )
}
