import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider } from './app/AuthContext'
import { useAuth } from './app/useAuth'
import { AppShell } from './components/AppShell'
import type { Role } from './lib/api'

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const PublicPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.PublicPage })))
const DashboardPage = lazy(() => import('./pages/OperationsPages').then((module) => ({ default: module.DashboardPage })))
const BinsPage = lazy(() => import('./pages/OperationsPages').then((module) => ({ default: module.BinsPage })))
const CollectionsPage = lazy(() => import('./pages/OperationsPages').then((module) => ({ default: module.CollectionsPage })))
const MarketplacePage = lazy(() => import('./pages/OperationsPages').then((module) => ({ default: module.MarketplacePage })))
const AnalyticsPage = lazy(() => import('./pages/OperationsPages').then((module) => ({ default: module.AnalyticsPage })))
const NotificationsPage = lazy(() => import('./pages/OperationsPages').then((module) => ({ default: module.NotificationsPage })))
const DemoGuidePage = lazy(() => import('./pages/OperationsPages').then((module) => ({ default: module.DemoGuidePage })))

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading your workspace…</div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function RoleRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  return user && roles.includes(user.role) ? children : <Navigate to="/app" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route path="/about" element={<PublicPage page="about" />} />
      <Route path="/how-it-works" element={<PublicPage page="how" />} />
      <Route path="/technology" element={<PublicPage page="technology" />} />
      <Route path="/impact" element={<PublicPage page="impact" />} />
      <Route path="/contact" element={<PublicPage page="contact" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="bins" element={<RoleRoute roles={['ADMINISTRATOR', 'COLLECTION_PARTNER', 'WASTE_COLLECTOR', 'LOCATION_MANAGER', 'ENVIRONMENTAL_OFFICER']}><BinsPage /></RoleRoute>} />
          <Route path="collections" element={<RoleRoute roles={['ADMINISTRATOR', 'COLLECTION_PARTNER', 'WASTE_COLLECTOR']}><CollectionsPage /></RoleRoute>} />
          <Route path="marketplace" element={<RoleRoute roles={['ADMINISTRATOR', 'COLLECTION_PARTNER', 'RECYCLING_COMPANY', 'ENVIRONMENTAL_OFFICER']}><MarketplacePage /></RoleRoute>} />
          <Route path="analytics" element={<RoleRoute roles={['ADMINISTRATOR', 'ENVIRONMENTAL_OFFICER']}><AnalyticsPage /></RoleRoute>} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="demo" element={<RoleRoute roles={['ADMINISTRATOR']}><DemoGuidePage /></RoleRoute>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Suspense fallback={<div className="page-loading">Loading PlastiTrack…</div>}>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
