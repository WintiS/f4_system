import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../lib/supabase'
import { AuthShell, Field } from './Login'

export default function Signup() {
  const { signUp } = useAuth()
  const { slug } = useParams()
  const navigate = useNavigate()
  const [schools, setSchools] = useState([])
  const [schoolId, setSchoolId] = useState('')
  const [lockedSchool, setLockedSchool] = useState(null) // { id, name } when a slug pins it
  const [slugMissing, setSlugMissing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Public list of schools; a URL slug preselects (and locks) one.
  useEffect(() => {
    let active = true
    supabase
      .from('schools')
      .select('id, name, slug')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!active) return
        const list = data ?? []
        setSchools(list)
        if (slug) {
          const found = list.find((s) => s.slug === slug)
          if (found) {
            setLockedSchool(found)
            setSchoolId(found.id)
          } else {
            setSlugMissing(true)
          }
        }
      })
    return () => {
      active = false
    }
  }, [slug])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!schoolId) return setError('Vyberte školu.')
    setBusy(true)
    const { data, error } = await signUp(
      email,
      password,
      firstName.trim(),
      lastName.trim(),
      schoolId,
    )
    setBusy(false)
    if (error) return setError(error.message)
    // If email confirmation is on, there's no session yet.
    if (data.session) navigate('/')
    else navigate('/login')
  }

  const subtitle = lockedSchool ? lockedSchool.name : 'Vytvořte si účet'

  return (
    <AuthShell title="Registrace instruktora" subtitle={subtitle}>
      {slugMissing ? (
        <p className="text-sm text-coral-600">
          Škola „{slug}“ nebyla nalezena. Zkontrolujte odkaz od správce školy.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {!lockedSchool && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Škola</span>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sea-400 focus:outline-none"
              >
                <option value="">— vyberte školu —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
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
      )}
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
