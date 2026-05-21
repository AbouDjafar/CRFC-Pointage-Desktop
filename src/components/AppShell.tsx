import { BarChart3, ClipboardList, History, Settings, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth, userFullName } from '@/contexts/AuthContext'

const navItems = [
  { to: '/rapport', label: 'Rapport', icon: ClipboardList },
  { to: '/historique', label: 'Historique', icon: History },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/employes', label: 'Employes', icon: Users },
  { to: '/reglages', label: 'Reglages', icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/assets/crfc_logo.svg" alt="CRFC" />
          <div>
            <div className="sidebar-title">CRFC Pointage</div>
            <div className="sidebar-subtitle">Desktop</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{userFullName(user!).charAt(0).toUpperCase()}</div>
          <div>
            <div className="sidebar-user-name">{userFullName(user!)}</div>
            <div className="sidebar-user-role">{user?.role === 'ADMIN' ? 'Administrateur' : 'Agent'}</div>
          </div>
        </div>
      </aside>
      <main className="content-area">{children}</main>
    </div>
  )
}
