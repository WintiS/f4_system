import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <AuthShell title="Přihlášení" subtitle="Přístup do administrace">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail" type="email" value={email} onChange={setEmail} autoFocus />
        <Field label="Heslo" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-coral-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-coral-500/25 transition hover:bg-coral-600 disabled:opacity-60"
        >
          {busy ? 'Přihlašování…' : 'Přihlásit se'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Jste instruktor?{' '}
        <Link to="/signup" className="font-semibold text-sea-700 hover:underline">
          Vytvořte si účet
        </Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sea-950 via-sea-900 to-sea-800 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-500 text-xl shadow-lg shadow-coral-500/30">
            🏄
          </div>
          <div>
            <div className="font-display text-lg font-semibold tracking-tight text-sea-900">
              {title}
            </div>
            <div className="text-xs text-slate-500">{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, value, onChange, type = 'text', autoFocus }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        required
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sea-400 focus:ring-2 focus:ring-sea-200"
      />
    </label>
  )
}
