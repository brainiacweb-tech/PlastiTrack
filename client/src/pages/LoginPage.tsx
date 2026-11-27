import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Leaf, LockKeyhole } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../app/useAuth'
import { roleLabel } from '../lib/api'
import { DEMO_PASSWORD, demoAccounts } from '../lib/demo'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})
type FormValues = z.infer<typeof schema>

const demos = demoAccounts.map(({ role, email }) => ({ role, email }))

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (user) return <Navigate to="/app" replace />

  async function onSubmit(values: FormValues) {
    setError('')
    try {
      await login(values.email, values.password)
      navigate('/app')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in. Please try again.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-visual">
        <Link to="/" className="brand-lockup brand-lockup-light">
          <img className="brand-image" src="/plastitrack-logo.png?v=2" alt="PlastiTrack — Track, Collect, Recycle." />
        </Link>
        <div className="login-visual-content">
          <div className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> INTELLIGENT WASTE INFRASTRUCTURE</div>
          <h1>Better collection.<br /><em>Less waste.</em></h1>
          <p>One connected view of the collection network — from a bin reaching capacity to plastic re-entering the circular economy.</p>
        </div>
        <div className="login-visual-footer"><Leaf size={17} /> A demonstration platform for a more circular future</div>
      </div>
      <div className="login-form-side">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to PlastiTrack</Link>
        <div className="login-card">
          <span className="login-icon"><LockKeyhole size={20} /></span>
          <p className="section-kicker">WELCOME BACK</p>
          <h2>Sign in to your workspace</h2>
          <p className="muted-copy">Use a demonstration account to explore role-specific features.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            <label>Email address
              <input type="email" placeholder="you@organization.com" autoComplete="username" {...register('email')} />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </label>
            <label>Password
              <span className="password-field">
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" {...register('password')} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
              {errors.password && <small className="field-error">{errors.password.message}</small>}
            </label>
            {error && <div role="alert" className="form-error">{error}</div>}
            <button type="submit" className="button button-primary button-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} />
            </button>
          </form>
          <div className="demo-account-list">
            <div className="demo-list-heading"><span>DEMO ACCOUNTS</span><span>Password shared</span></div>
            <div className="demo-account-grid">
              {demos.map(({ role, email }) => (
                <button
                  type="button"
                  key={role}
                  className="demo-account"
                  onClick={() => { setValue('email', email); setValue('password', DEMO_PASSWORD); setError('') }}
                >
                  <span>{roleLabel(role)}</span><ArrowRight size={14} />
                </button>
              ))}
            </div>
            <p className="demo-password-note">Password: <code>{DEMO_PASSWORD}</code></p>
          </div>
        </div>
        <p className="login-footnote">No server or PostgreSQL is required. Demo data is stored in this browser only.</p>
      </div>
    </div>
  )
}
