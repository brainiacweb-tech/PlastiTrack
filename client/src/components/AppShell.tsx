import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Bell,
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  LogOut,
  Menu,
  Recycle,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../app/useAuth'
import { roleLabel } from '../lib/api'
import type { Role } from '../lib/api'

const menu = [
  { to: '/app', label: 'Overview', icon: ChartNoAxesCombined, roles: null },
  { to: '/app/bins', label: 'Smart bins', icon: Boxes, roles: ['ADMINISTRATOR', 'COLLECTION_PARTNER', 'WASTE_COLLECTOR', 'LOCATION_MANAGER', 'ENVIRONMENTAL_OFFICER'] as Role[] },
  { to: '/app/collections', label: 'Collections', icon: ClipboardList, roles: ['ADMINISTRATOR', 'COLLECTION_PARTNER', 'WASTE_COLLECTOR'] as Role[] },
  { to: '/app/marketplace', label: 'Recycling marketplace', icon: Recycle, roles: ['ADMINISTRATOR', 'COLLECTION_PARTNER', 'RECYCLING_COMPANY', 'ENVIRONMENTAL_OFFICER'] as Role[] },
  { to: '/app/analytics', label: 'Impact & analytics', icon: Activity, roles: ['ADMINISTRATOR', 'ENVIRONMENTAL_OFFICER'] as Role[] },
  { to: '/app/notifications', label: 'Notifications', icon: Bell, roles: null },
  { to: '/app/demo', label: 'System guide', icon: CircleHelp, roles: null },
]

const pageTitles: Record<string, string> = {
  '/app': 'Overview',
  '/app/bins': 'Smart bin management',
  '/app/collections': 'Collection operations',
  '/app/marketplace': 'Recycling marketplace',
  '/app/analytics': 'Impact & analytics',
  '/app/notifications': 'Notifications',
  '/app/demo': 'System guide',
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const initials = user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-frame">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <Link to="/app" className="brand-lockup" onClick={() => setMobileOpen(false)}>
          <img className="brand-image" src={`${import.meta.env.BASE_URL}plastitrack-logo.png?v=2`} alt="PlastiTrack — Track, Collect, Recycle. A Cleaner Ghana, A Greener Tomorrow." />
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          {menu.filter((item) => !item.roles || item.roles.includes(user?.role ?? 'ADMINISTRATOR')).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-sidebar-note"><ShieldCheck size={16} /> Simulation environment</div>
        </div>
        <div className="sidebar-footer">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-copy"><strong>{user?.name}</strong><span>{user && roleLabel(user.role)}</span></div>
          <button className="icon-button logout-button" title="Sign out" onClick={handleLogout}><LogOut size={17} /></button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitles[location.pathname] ?? 'Overview'}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="demo-status" title="Dashboard data refreshes every five seconds; all data is simulated"><span /> Demo · refreshes every 5s</span>
            <Link to="/app/notifications" className="icon-button notification-button" aria-label="Open notifications"><Bell size={18} /></Link>
            <button className="user-dropdown" onClick={() => navigate('/app/demo')}>
              <span className="profile-avatar profile-avatar-small">{initials}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  )
}
