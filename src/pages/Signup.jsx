import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { AuthShell, Field } from './Login'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { data, error } = await signUp(email, password, firstName.trim(), lastName.trim())
    setBusy(false)
    if (error) return setError(error.message)
    // If email confirmation is on, there's no session yet.
    if (data.session) navigate('/')
    else navigate('/login')
  }

  return (
    <AuthShell title="Registrace instruktora" subtitle="Vytvořte si účet">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Jméno" value={firstName} onChange={setFirstName} autoFocus />
        <Field label="Příjmení" value={lastName} onChange={setLastName} />
        <Field label="E-mail" type="email" value={email} onChange={setEmail} />
        <Field label="Heslo" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-coral-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-coral-500/25 transition hover:bg-coral-600 disabled:opacity-60"
        >
          {busy ? 'Vytváření…' : 'Vytvořit účet'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">
        Po registraci vás musí schválit správce, než se objevíte v seznamu instruktorů.
      </p>
      <p className="mt-4 text-center text-sm text-slate-500">
        Máte už účet?{' '}
        <Link to="/login" className="font-semibold text-sea-700 hover:underline">
          Přihlaste se
        </Link>
      </p>
    </AuthShell>
  )
}
