import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { TimerProvider } from './contexts/TimerContext'
import { Layout } from './components/layout/Layout'

// Lazy-load pages — each route gets its own JS chunk for faster initial load
const AuthPage            = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })))
const DashboardPage       = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const SubjectsPage        = lazy(() => import('./pages/SubjectsPage').then(m => ({ default: m.SubjectsPage })))
const AnalyticsPage       = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const SocialPage          = lazy(() => import('./pages/SocialPage').then(m => ({ default: m.SocialPage })))
const PracticeTrackerPage = lazy(() => import('./pages/PracticeTrackerPage').then(m => ({ default: m.PracticeTrackerPage })))
const CurriculumPage      = lazy(() => import('./pages/CurriculumPage').then(m => ({ default: m.CurriculumPage })))
const AIPlannerPage       = lazy(() => import('./pages/AIPlannerPage').then(m => ({ default: m.AIPlannerPage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>
  )
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-[3px] border-primary-600 border-t-transparent animate-spin" />
        <p className="text-sm text-zinc-400 font-medium">Loading…</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="subjects" element={<Suspense fallback={<PageLoader />}><SubjectsPage /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
          <Route path="social" element={<Suspense fallback={<PageLoader />}><SocialPage /></Suspense>} />
          <Route path="urt" element={<Suspense fallback={<PageLoader />}><PracticeTrackerPage /></Suspense>} />
          <Route path="curriculum" element={<Suspense fallback={<PageLoader />}><CurriculumPage /></Suspense>} />
          <Route path="ai-planner" element={<Suspense fallback={<PageLoader />}><AIPlannerPage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

// TimerProvider must be inside AuthProvider (timer needs the authed user)
function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return <TimerProvider>{children}</TimerProvider>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedProviders>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthenticatedProviders>
      </AuthProvider>
    </ThemeProvider>
  )
}
