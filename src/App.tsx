import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLoader } from '@/components/AppLoader'
import { RuntimeModalHost } from '@/components/RuntimeModalHost'
import { AppShell } from '@/components/AppShell'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { DataProvider, useData } from '@/contexts/DataContext'
import { EmployeeDetailPage } from '@/pages/EmployeeDetailPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ReportDetailPage } from '@/pages/ReportDetailPage'
import { ReportPage } from '@/pages/ReportPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StatsPage } from '@/pages/StatsPage'

const queryClient = new QueryClient()
const runtimeWindow = typeof window === 'undefined' ? undefined : (window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown })
const RouterComponent = runtimeWindow && (runtimeWindow.__TAURI__ || runtimeWindow.__TAURI_INTERNALS__) ? HashRouter : BrowserRouter

function StartupCoordinator() {
  const { loading: authLoading } = useAuth()
  const { loading: dataLoading } = useData()
  const completedRef = useRef(false)

  useEffect(() => {
    if (completedRef.current || authLoading || dataLoading) return

    completedRef.current = true

    async function notifyReady() {
      if (!runtimeWindow || (!runtimeWindow.__TAURI__ && !runtimeWindow.__TAURI_INTERNALS__)) return
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('complete_startup')
      } catch (error) {
        console.error('Unable to complete startup', error)
      }
    }

    void notifyReady()
  }, [authLoading, dataLoading])

  return null
}

function PublicOnly() {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader message="Initialisation..." />
  return user ? <Navigate to="/rapport" replace /> : <Outlet />
}

function ProtectedApp() {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader message="Chargement..." />
  if (!user) return <Navigate to="/login" replace />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader message="Bienvenue..." />
  return <Navigate to={user ? '/rapport' : '/login'} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataProvider>
          <RouterComponent>
            <StartupCoordinator />
            <RuntimeModalHost />
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route element={<PublicOnly />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route element={<ProtectedApp />}>
                <Route path="/rapport" element={<ReportPage />} />
                <Route path="/historique" element={<HistoryPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/employes" element={<EmployeesPage />} />
                <Route path="/reglages" element={<SettingsPage />} />
                <Route path="/report/:id" element={<ReportDetailPage />} />
                <Route path="/employee/:id" element={<EmployeeDetailPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </RouterComponent>
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
