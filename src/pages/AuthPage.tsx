import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type Mode = 'login' | 'signup'

export function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mode, setMode] = useState<Mode>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!loading && user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (username.length < 3) throw new Error('Username must be at least 3 characters.')
        await signUp(email, password, username, fullName)
        setSuccess('Account created! Check your email to confirm your address.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-primary-600 p-10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-white/20">
            <Zap size={18} className="text-white" />
          </span>
          <span className="text-xl font-bold text-white">Zaker</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Track every minute. <br />Own your progress.
          </h1>
          <p className="mt-4 text-primary-200 text-sm leading-relaxed">
            Zaker helps students track study time per subject, manage breaks, and compete on group leaderboards.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              { icon: '⏱️', label: 'Accurate per-subject timers' },
              { icon: '📊', label: 'Daily, weekly & monthly analytics' },
              { icon: '🏆', label: 'Group leaderboards & competitions' },
              { icon: '🌙', label: 'Prayer & break tracking built in' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-white">
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-300 text-xs">© {new Date().getFullYear()} Zaker</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="p-1.5 rounded-lg bg-primary-600">
              <Zap size={16} className="text-white" />
            </span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Zaker</span>
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mode === 'login'
              ? 'Sign in to your Zaker account.'
              : 'Start tracking your study sessions.'}
          </p>

          {/* Error / Success */}
          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mode === 'signup' && (
              <>
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="e.g. Ahmed Ali"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  leftIcon={<User size={15} />}
                />
                <Input
                  label="Username"
                  type="text"
                  placeholder="e.g. ahmed123"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  leftIcon={<span className="text-xs font-bold">@</span>}
                  hint="Minimum 3 characters, used in leaderboards."
                />
              </>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              leftIcon={<Mail size={15} />}
              required
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Lock size={15} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button type="submit" loading={submitting} size="lg" className="mt-2">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null) }}
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
